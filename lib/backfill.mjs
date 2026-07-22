// ccrank backfill — one-time import of the last 7 days of LOCAL Claude Code
// history, so a brand-new user doesn't debut at the bottom of the board.
// Reads the transcripts Claude Code itself writes (~/.claude/projects/**/*.jsonl)
// and counts prompts + edits the same way the live hook would have. Only
// per-day COUNTS are produced — message content never leaves this module.
//
// Today (UTC) is excluded: the live hooks already count it, and the server
// additionally refuses any day the user has tracked events on.

import { readdirSync, statSync, createReadStream } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);

// Same line-counting rules as lib/hook.mjs editValue() — a number only.
function editLines(name, inp) {
  let text = "";
  if (name === "Write") text = inp?.content || "";
  else if (name === "Edit") text = inp?.new_string || "";
  else if (name === "MultiEdit") text = (inp?.edits || []).map((e) => e?.new_string || "").join("\n");
  const lines = String(text).split("\n").filter((l) => l.trim().length).length;
  return Math.max(1, lines);
}

// A transcript "user" entry that the UserPromptSubmit hook would have fired
// for: a real typed prompt — not tool results, not meta/compact bookkeeping,
// not a subagent's inner conversation.
function isRealPrompt(e) {
  if (e.type !== "user" || e.isMeta || e.isSidechain || e.isCompactSummary) return false;
  if (e.userType && e.userType !== "external") return false;
  const content = e.message?.content;
  if (typeof content === "string") {
    return content.trim().length > 0 && !content.startsWith("<local-command-stdout>");
  }
  if (Array.isArray(content)) {
    if (content.some((b) => b?.type === "tool_result")) return false;
    return content.some((b) => b?.type === "text" && String(b.text || "").trim().length);
  }
  return false;
}

function* jsonlFiles(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) yield* jsonlFiles(p);
    else if (ent.name.endsWith(".jsonl")) yield p;
  }
}

function scanFile(path, start, end, byDay) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    rl.on("line", (line) => {
      let e;
      try { e = JSON.parse(line); } catch { return; }
      const ts = Date.parse(e?.timestamp || "");
      if (!Number.isFinite(ts) || ts < start || ts >= end) return;
      const day = new Date(ts).toISOString().slice(0, 10);
      let d = byDay.get(day);
      if (!d) { d = { day, prompts: 0, edits: 0, lines: 0 }; byDay.set(day, d); }
      if (isRealPrompt(e)) { d.prompts++; return; }
      // Edits: PostToolUse fires inside subagents too, so no isSidechain filter.
      if (e?.type === "assistant" && Array.isArray(e.message?.content)) {
        for (const b of e.message.content) {
          if (b?.type === "tool_use" && EDIT_TOOLS.has(b.name)) {
            d.edits++;
            d.lines += editLines(b.name, b.input || {});
          }
        }
      }
    });
    rl.on("close", resolve);
    rl.on("error", resolve);
  });
}

// ---- Codex (best-effort) ---------------------------------------------------
// Codex CLI writes rollout files (~/.codex/sessions/**/*.jsonl). The format is
// Codex-internal and less stable than Claude's, so this parser is deliberately
// conservative: shapes it doesn't recognize count 0, never garbage. Prompts =
// durable response_item user messages with real typed text (Codex wraps its
// injected user_instructions / environment_context in <tags>, so a leading
// '<' is filtered out). Edits = apply_patch calls, lines = added '+' lines.
function codexPromptOrEdit(e, d) {
  const p = e?.payload;
  if (e?.type !== "response_item" || !p) return;
  if (p.type === "message" && p.role === "user") {
    const texts = Array.isArray(p.content)
      ? p.content.filter((b) => b?.type === "input_text").map((b) => String(b.text || ""))
      : [];
    const t = texts.join("").trim();
    if (t.length && !t.startsWith("<")) d.prompts++;
    return;
  }
  let patch = null;
  if (p.type === "function_call") {
    const name = String(p.name || "");
    const args = String(p.arguments || "");
    if (name === "apply_patch" || (name === "shell" && args.includes("apply_patch"))) patch = args;
  } else if (p.type === "custom_tool_call" && String(p.name || "") === "apply_patch") {
    patch = String(p.input || "");
  }
  if (patch != null) {
    const added = patch.split("\n")
      .filter((l) => l.startsWith("+") && !l.startsWith("+++") && l.slice(1).trim().length).length;
    d.edits++;
    d.lines += Math.max(1, added);
  }
}

function scanCodexFile(path, start, end, byDay) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    rl.on("line", (line) => {
      let e;
      try { e = JSON.parse(line); } catch { return; }
      const ts = Date.parse(e?.timestamp || "");
      if (!Number.isFinite(ts) || ts < start || ts >= end) return;
      const day = new Date(ts).toISOString().slice(0, 10);
      let d = byDay.get(day);
      if (!d) { d = { day, prompts: 0, edits: 0, lines: 0 }; byDay.set(day, d); }
      codexPromptOrEdit(e, d);
    });
    rl.on("close", resolve);
    rl.on("error", resolve);
  });
}

async function scanRoot(root, start, end, byDay, scanOne) {
  for (const file of jsonlFiles(root)) {
    // A file last touched before the window started can't hold in-window entries.
    try { if (statSync(file).mtimeMs < start) continue; } catch { continue; }
    await scanOne(file, start, end, byDay);
  }
}

// Scan the last `daysBack` full UTC days (today excluded) of BOTH agents'
// local history — history is history, whatever agent it came from. Returns
// { days: [{day, prompts, edits, lines}], prompts, edits, lines } — sorted by
// day, zero-activity days omitted.
export async function scanHistory(daysBack = 7) {
  const end = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z"); // start of today UTC
  const start = end - daysBack * 86400000;

  const byDay = new Map();
  await scanRoot(join(homedir(), ".claude", "projects"), start, end, byDay, scanFile);
  await scanRoot(join(homedir(), ".codex", "sessions"), start, end, byDay, scanCodexFile);

  const days = [...byDay.values()]
    .filter((d) => d.prompts + d.edits > 0)
    .sort((a, b) => (a.day < b.day ? -1 : 1));
  const sum = (k) => days.reduce((s, d) => s + d[k], 0);
  return { days, prompts: sum("prompts"), edits: sum("edits"), lines: sum("lines") };
}
