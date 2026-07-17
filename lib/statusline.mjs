// ccrank statusline — prints your live room rank, e.g.  CC-Rank #2/5 · see leaderboard
// The "see leaderboard" text is a clickable terminal link to your room page.
// If you already had a statusline, it runs that first and appends this,
// so nothing you had is lost.

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const CC = join(homedir(), ".ccrank");
const CACHE = join(CC, "cache.json");

function config() {
  try { return JSON.parse(readFileSync(join(CC, "config.json"), "utf8")); }
  catch { return null; }
}
function readStdin() { try { return readFileSync(0, "utf8"); } catch { return ""; } }

// Run the user's previous statusline command, feeding it the same stdin.
function runWrapped(cmd, input) {
  return new Promise((resolve) => {
    if (!cmd) return resolve("");
    let out = "";
    const child = spawn(cmd, { shell: true });
    const kill = setTimeout(() => { try { child.kill(); } catch {} resolve(out.trim()); }, 1000);
    child.stdout.on("data", (d) => (out += d));
    child.on("close", () => { clearTimeout(kill); resolve(out.trim()); });
    child.on("error", () => { clearTimeout(kill); resolve(""); });
    // A fast-exiting child may close stdin before we finish writing — swallow EPIPE.
    child.stdin.on("error", () => {});
    try { child.stdin.write(input); child.stdin.end(); } catch {}
  });
}

// Wrap text in an OSC 8 terminal hyperlink. Terminals that support it (iTerm2,
// WezTerm, Kitty, recent VS Code / GNOME Terminal) make it click / ⌘-click to
// open; ones that don't just show the plain text.
function link(url, text) {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

// Rank colors: #1 gold, #2 silver, #3 bronze, everyone else bright cyan.
function rankColor(rank) {
  if (rank === 1) return "\x1b[1;38;5;220m";
  if (rank === 2) return "\x1b[1;38;5;252m";
  if (rank === 3) return "\x1b[1;38;5;208m";
  return "\x1b[1;96m";
}

async function rankSegment(cfg) {
  const roomUrl = cfg.server.replace(/\/$/, "") + "/r/" + cfg.roomCode;
  const view = `\x1b[94;4m${link(roomUrl, "leaderboard ↗")}\x1b[0m`; // bright blue + underline
  const label = "\x1b[1;35mCC-Rank\x1b[0m";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(
      cfg.server.replace(/\/$/, "") + "/api/me?token=" + encodeURIComponent(cfg.token),
      { signal: ctrl.signal }
    );
    const me = await res.json();
    if (me && me.rank) {
      try { writeFileSync(CACHE, JSON.stringify(me)); } catch {}
      return `${label} ${rankColor(me.rank)}#${me.rank}/${me.total}\x1b[0m \x1b[2m·\x1b[0m ${view}`;
    }
    // Server answered but doesn't know us — room/player was deleted.
    if (res.status === 401 || res.status === 404) {
      try { unlinkSync(CACHE); } catch {} // dead room: don't let a stale rank resurface offline
      const home = `\x1b[94;4m${link(cfg.server.replace(/\/$/, ""), "make a new room ↗")}\x1b[0m`;
      return `\x1b[1;38;5;203mroom deleted\x1b[0m \x1b[2m·\x1b[0m ${home}`;
    }
  } catch {
    try {
      const me = JSON.parse(readFileSync(CACHE, "utf8"));
      if (me?.rank) return `${label} ${rankColor(me.rank)}#${me.rank}/${me.total}\x1b[0m \x1b[2m·\x1b[0m ${view}`;
    } catch {}
  } finally {
    clearTimeout(timer);
  }
  // No rank yet (or offline with no cache) — still offer the link.
  return view;
}

async function main() {
  const input = readStdin();
  const cfg = config();
  const prev = cfg?.wrappedStatusLine ? await runWrapped(cfg.wrappedStatusLine, input) : "";
  const seg = cfg?.token ? await rankSegment(cfg) : "";
  const line = [prev, seg].filter(Boolean).join("  ");
  process.stdout.write(line);
}

main().finally(() => process.exit(0));
