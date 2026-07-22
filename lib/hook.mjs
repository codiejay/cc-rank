// ccrank hook — runs on Claude Code or Codex UserPromptSubmit / PostToolUse.
// Sends ONLY counts + metadata to the server. Never sends code content.
// Must stay silent on stdout (UserPromptSubmit stdout is injected into context).
//
// argv[2] = kind ('prompt' | 'edit'); argv[3] = source ('claude' | 'codex').
// The installer bakes the source in per agent, so one hook file serves both.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { maybeAutoUpdate } from "./update-check.mjs";

const kind = process.argv[2] === "edit" ? "edit" : "prompt";
const source = process.argv[3] === "codex" ? "codex" : "claude";

function config() {
  try { return JSON.parse(readFileSync(join(homedir(), ".ccrank", "config.json"), "utf8")); }
  catch { return null; }
}

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

// Count lines touched by an edit — a number only, no content ever leaves the
// machine. Claude Code tools carry the new text directly; Codex's apply_patch
// carries a unified-diff-ish patch, so we count its added ('+') lines.
function editValue(payload) {
  try {
    const t = payload.tool_name || "";
    const inp = payload.tool_input || {};
    // Codex applies edits as a patch (apply_patch). Count added lines.
    if (t === "apply_patch" || (source === "codex" && !inp.content && !inp.new_string)) {
      const patch = String(inp.input || inp.patch || inp.content || inp.changes || "");
      const added = patch.split("\n").filter(
        (l) => l.startsWith("+") && !l.startsWith("+++") && l.slice(1).trim().length).length;
      if (added) return added;
      // Not a recognizable patch — fall back to non-empty line count.
      const any = patch.split("\n").filter((l) => l.trim().length).length;
      return Math.max(1, any);
    }
    let text = "";
    if (t === "Write") text = inp.content || "";
    else if (t === "Edit") text = inp.new_string || "";
    else if (t === "MultiEdit") text = (inp.edits || []).map((e) => e.new_string || "").join("\n");
    const lines = text.split("\n").filter((l) => l.trim().length).length;
    return Math.max(1, lines);
  } catch { return 1; }
}

async function main() {
  const cfg = config();
  if (!cfg?.token || !cfg?.server) return; // not set up; do nothing

  let payload = {};
  try { payload = JSON.parse(readStdin() || "{}"); } catch {}

  const value = kind === "edit" ? editValue(payload) : 1;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    await fetch(cfg.server.replace(/\/$/, "") + "/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: cfg.token, kind, value, source }),
      signal: ctrl.signal,
    });
  } catch {
    /* offline / slow — never block Claude Code */
  } finally {
    clearTimeout(timer);
  }
  // Daily no-op except when a new client version exists (see update-check.mjs).
  // Covers Codex-only users, who have no statusline. Stays silent on stdout.
  await maybeAutoUpdate(cfg.server);
}

main().finally(() => process.exit(0));
