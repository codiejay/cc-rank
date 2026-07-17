// ccrank hook — runs on Claude Code UserPromptSubmit / PostToolUse.
// Sends ONLY counts + metadata to the server. Never sends code content.
// Must stay silent on stdout (UserPromptSubmit stdout is injected into context).

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const kind = process.argv[2] === "edit" ? "edit" : "prompt";

function config() {
  try { return JSON.parse(readFileSync(join(homedir(), ".ccrank", "config.json"), "utf8")); }
  catch { return null; }
}

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

// Count lines touched by an edit — a number only, no content ever leaves the machine.
function editValue(payload) {
  try {
    const t = payload.tool_name || "";
    const inp = payload.tool_input || {};
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
      body: JSON.stringify({ token: cfg.token, kind, value }),
      signal: ctrl.signal,
    });
  } catch {
    /* offline / slow — never block Claude Code */
  } finally {
    clearTimeout(timer);
  }
}

main().finally(() => process.exit(0));
