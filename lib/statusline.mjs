// ccrank statusline — prints your live GLOBAL rank, e.g.  CC-Rank #2/14 · leaderboard ↗
// The "leaderboard" text links to the GLOBAL board only — never room URLs or
// personal params; this line lives on screen through screenshares.
// If you already had a statusline, it runs that first and appends this,
// so nothing you had is lost.

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const CC = join(homedir(), ".ccrank");
const CACHE = join(CC, "cache.json");
// Only hit the network every CACHE_TTL_MS; serve cache in between. This is the
// single biggest lever on server/D1 usage — the statusline re-renders far more
// often than this, so without it we'd query the DB on every keystroke-ish tick.
const CACHE_TTL_MS = 15 * 1000;
// If the data we're showing is older than this (e.g. we're offline and serving
// old cache), flag it so nobody trusts a stale rank as live.
const STALE_AFTER_MS = 5 * 60 * 1000;

function config() {
  try { return JSON.parse(readFileSync(join(CC, "config.json"), "utf8")); }
  catch { return null; }
}
function readStdin() { try { return readFileSync(0, "utf8"); } catch { return ""; } }
function readCache() { try { return JSON.parse(readFileSync(CACHE, "utf8")); } catch { return null; } }
function writeCache(obj) { try { writeFileSync(CACHE, JSON.stringify({ ...obj, _ts: Date.now() })); } catch {} }

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
  const base = cfg.server.replace(/\/$/, "");
  // ALWAYS the global board. Never the room URL: room codes are join
  // credentials, and the statusline sits on screen through every screenshare
  // and recording — printing /r/CODE here would leak room access to anyone
  // watching. (Same reason there's no ?me= — nothing personal in this line.)
  // Your rooms are one click away in the site's sidebar once you're there.
  const boardUrl = base + "/";
  const view = `\x1b[94;4m${link(boardUrl, "leaderboard ↗")}\x1b[0m`;
  const label = "\x1b[1;35mCC-Rank\x1b[0m";
  // Second line: the plain URL. OSC-8 "leaderboard ↗" isn't clickable in
  // every terminal (e.g. Conductor), so the raw URL below is always copyable and
  // gets auto-linkified by terminals that only detect plain URLs. Kept as plain
  // text with no ANSI — Claude Code drops escape-coded extra lines when rendering.
  const withUrl = (line, u = boardUrl) => `${line}\n${u}`;
  // A dim "· Nm old" suffix when the shown data is older than STALE_AFTER_MS.
  const age = (ts) => {
    const ms = Date.now() - (ts || 0);
    if (ms < STALE_AFTER_MS) return "";
    const m = Math.round(ms / 60000);
    return m < 60 ? ` \x1b[2m· ${m}m old\x1b[0m` : ` \x1b[2m· ${Math.round(m / 60)}h old\x1b[0m`;
  };
  const fmtRank = (me, ts) => `${label} ${rankColor(me.rank)}#${me.rank}/${me.total}\x1b[0m \x1b[2m·\x1b[0m ${view}${age(ts)}`;
  const deleted = () => `\x1b[1;38;5;203msigned out\x1b[0m \x1b[2m·\x1b[0m \x1b[94;4m${link(base, "re-join ccrank ↗")}\x1b[0m`;
  const fromCache = (c) =>
    c?.deleted ? withUrl(deleted(), base) : c?.rank ? withUrl(fmtRank(c, c._ts)) : null;

  // Serve a fresh-enough cache without any network call.
  const cached = readCache();
  if (cached && cached.roomCode === cfg.roomCode && cached._ts &&
      Date.now() - cached._ts < CACHE_TTL_MS) {
    const line = fromCache(cached);
    if (line) return line;
  }

  // Cache stale/missing — refresh from the server (bounded by a timeout).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(base + "/api/me?token=" + encodeURIComponent(cfg.token), { signal: ctrl.signal });
    const me = await res.json();
    if (me && me.rank) {
      writeCache({ ...me, roomCode: cfg.roomCode });
      return withUrl(fmtRank(me, Date.now())); // just fetched — no age suffix
    }
    // Server answered but doesn't know us — room/player was deleted.
    if (res.status === 401 || res.status === 404) {
      writeCache({ deleted: true, roomCode: cfg.roomCode });
      return withUrl(deleted(), base);
    }
  } catch {
    // Offline / slow — fall back to whatever we last cached, even if stale.
    const line = fromCache(cached);
    if (line) return line;
  } finally {
    clearTimeout(timer);
  }
  // No rank yet (or offline with no cache) — still offer the link.
  return withUrl(view);
}

async function main() {
  const input = readStdin();
  const cfg = config();
  const prev = cfg?.wrappedStatusLine ? await runWrapped(cfg.wrappedStatusLine, input) : "";
  const seg = cfg?.token ? await rankSegment(cfg) : "";
  process.stdout.write([prev, seg].filter(Boolean).join("  "));
}

main().finally(() => process.exit(0));
