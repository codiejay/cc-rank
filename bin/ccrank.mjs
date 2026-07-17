#!/usr/bin/env node
// ccrank CLI — create/join rooms and (un)install the Claude Code hooks.
// Zero dependencies, no build step.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, "..");
const CC_DIR = join(homedir(), ".ccrank");                 // our config + hook scripts live here
const CFG = join(CC_DIR, "config.json");
const CLAUDE_SETTINGS = join(homedir(), ".claude", "settings.json");

// Default server. Overridable with --server <url> or CCRANK_SERVER env.
// >>> After you deploy the Worker, replace this with your *.workers.dev URL. <<<
const DEFAULT_SERVER = process.env.CCRANK_SERVER || "https://ccrank.jamesakpan.workers.dev";

// ---- tiny arg parsing ----------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[++i];
  else pos.push(rest[i]);
}
const server = (flags.server || DEFAULT_SERVER).replace(/\/$/, "");

const c = { dim: (s) => `\x1b[2m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`,
            g: (s) => `\x1b[32m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m` };

async function api(path, method = "GET", body) {
  const res = await fetch(server + path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function loadConfig() { try { return JSON.parse(readFileSync(CFG, "utf8")); } catch { return null; } }
function saveConfig(cfg) { mkdirSync(CC_DIR, { recursive: true }); writeFileSync(CFG, JSON.stringify(cfg, null, 2)); }

// Copy hook.mjs + statusline.mjs into ~/.ccrank so Claude Code can run them.
function installScripts() {
  mkdirSync(CC_DIR, { recursive: true });
  for (const f of ["hook.mjs", "statusline.mjs"]) copyFileSync(join(PKG_ROOT, "lib", f), join(CC_DIR, f));
}

// Merge our hooks (and optionally statusline) into ~/.claude/settings.json, non-destructively.
function wireClaude() {
  let s = {};
  if (existsSync(CLAUDE_SETTINGS)) {
    try { s = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")); }
    catch { throw new Error(`Could not parse ${CLAUDE_SETTINGS}. Fix or move it, then re-run.`); }
  } else {
    mkdirSync(dirname(CLAUDE_SETTINGS), { recursive: true });
  }
  s.hooks ||= {};
  const hookCmd = (arg) => `node "${join(CC_DIR, "hook.mjs")}" ${arg}`;

  const ensure = (event, matcher, arg) => {
    s.hooks[event] ||= [];
    const cmd = hookCmd(arg);
    // Compare actual command strings (JSON.stringify escaping broke substring matches).
    const already = s.hooks[event].some(
      (g) => (g.hooks || []).some((h) => h.command === cmd)
    );
    if (already) return;
    const entry = { hooks: [{ type: "command", command: cmd }] };
    if (matcher) entry.matcher = matcher;
    s.hooks[event].push(entry);
  };
  ensure("UserPromptSubmit", null, "prompt");
  ensure("PostToolUse", "Edit|Write|MultiEdit", "edit");

  // Statusline: preserve any existing one by wrapping it.
  const ourStatus = `node "${join(CC_DIR, "statusline.mjs")}"`;
  let wrapped = null;
  const existing = s.statusLine;
  if (existing && existing.command && !existing.command.includes("statusline.mjs")) {
    wrapped = existing.command; // first install: capture the user's real statusline
  } else if (existing && existing.command) {
    // Re-join: our statusline is already installed. Don't treat it as the
    // user's original — keep whatever original we captured on the first join.
    wrapped = loadConfig()?.wrappedStatusLine || null;
  }
  s.statusLine = { type: "command", command: ourStatus };
  return { settings: s, wrapped };
}

// ---- commands ------------------------------------------------------------

async function create() {
  const name = flags.name || pos[0] || "My room";
  const { code } = await api("/api/rooms", "POST", { name });
  console.log(`\n  ${c.g("✓")} Room created: ${c.b(name)}`);
  console.log(`  Code:      ${c.y(code)}`);
  console.log(`  Dashboard: ${c.dim(server + "/r/" + code)}\n`);
  console.log(`  Invite friends — each of them runs:`);
  console.log(`    ${c.b(`npx github:codiejay/cc-rank join ${code} --name THEIR_NAME`)}\n`);
  console.log(`  Join it yourself now:`);
  console.log(`    ${c.b(`npx github:codiejay/cc-rank join ${code} --name YOU`)}\n`);
}

async function joinRoom() {
  const code = (pos[0] || flags.code || "").toUpperCase();
  const name = flags.name || pos[1];
  if (!code) return fail("Usage: ccrank join <ROOM_CODE> --name YOUR_NAME");
  if (!name) return fail("Please pass --name YOUR_NAME");

  const prev = loadConfig();
  const rejoining = prev?.token && prev.roomCode === code;
  // Already in this room? Reuse the same player/token so counts aren't split
  // and no duplicate player appears on the board. Otherwise create a new one.
  const res = rejoining
    ? { token: prev.token, playerId: prev.playerId, name: prev.name,
        roomCode: prev.roomCode, roomName: prev.roomName }
    : await api(`/api/rooms/${code}/join`, "POST", { name });
  const useServer = rejoining ? prev.server : server;

  installScripts();
  const { settings, wrapped } = wireClaude();

  saveConfig({
    server: useServer, token: res.token, playerId: res.playerId,
    name: res.name, roomCode: res.roomCode, roomName: res.roomName,
    wrappedStatusLine: wrapped || null,
  });
  mkdirSync(dirname(CLAUDE_SETTINGS), { recursive: true });
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(settings, null, 2));

  const verb = rejoining ? "Re-synced" : "Joined";
  console.log(`\n  ${c.g("✓")} ${verb} ${c.b(res.roomName)} as ${c.y(res.name)}`);
  console.log(`  Your prompts & edits now count toward the leaderboard.`);
  console.log(`  Standings: ${c.dim(useServer + "/r/" + code)}`);
  if (wrapped) console.log(c.dim(`  (kept your existing statusline; rank is appended to it)`));
  console.log(c.dim(`\n  Restart Claude Code (or open a new session) to activate.\n`));
}

// Pull the latest hook/statusline scripts for your current room — no re-join,
// same player, counts untouched.
async function update() {
  const cfg = loadConfig();
  if (!cfg?.token) return fail("Not in a room yet. Run: ccrank join <CODE> --name YOU");
  installScripts();
  const { settings, wrapped } = wireClaude();
  saveConfig({ ...cfg, wrappedStatusLine: wrapped ?? cfg.wrappedStatusLine ?? null });
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(settings, null, 2));
  console.log(`\n  ${c.g("✓")} Updated to the latest ccrank scripts for ${c.b(cfg.roomName)}.`);
  console.log(c.dim(`  Restart Claude Code (or open a new session) to activate.\n`));
}

async function status() {
  const cfg = loadConfig();
  if (!cfg) return console.log("Not in a room yet. Run: ccrank join <CODE> --name YOU");
  try {
    const me = await api(`/api/me?token=${encodeURIComponent(cfg.token)}`);
    console.log(`\n  ${c.b(cfg.roomName)} ${c.dim("· " + cfg.roomCode)}`);
    console.log(`  ${c.y(cfg.name)} — rank ${c.b("#" + me.rank + "/" + me.total)}, score ${c.g(me.score)}`);
    console.log(`  ${c.dim(cfg.server + "/r/" + cfg.roomCode)}\n`);
  } catch (e) { fail(e.message); }
}

function leave() {
  // Remove our hooks + restore any wrapped statusline. Leaves config in place.
  const cfg = loadConfig();
  if (existsSync(CLAUDE_SETTINGS)) {
    const s = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8"));
    for (const ev of Object.keys(s.hooks || {})) {
      s.hooks[ev] = s.hooks[ev].filter((g) => !JSON.stringify(g).includes("hook.mjs"));
      if (!s.hooks[ev].length) delete s.hooks[ev];
    }
    if (s.statusLine?.command?.includes("statusline.mjs")) {
      if (cfg?.wrappedStatusLine) s.statusLine = { type: "command", command: cfg.wrappedStatusLine };
      else delete s.statusLine;
    }
    writeFileSync(CLAUDE_SETTINGS, JSON.stringify(s, null, 2));
  }
  console.log(`  ${c.g("✓")} Removed ccrank hooks. Restart Claude Code to finish.`);
}

function fail(msg) { console.error(`  ${msg}`); process.exitCode = 1; }

function help() {
  console.log(`
  ${c.b("ccrank")} — a Claude Code leaderboard for you and your friends

  ${c.y("ccrank create")} --name "Room name"        create a room, get a code
  ${c.y("ccrank join")} <CODE> --name YOU           join a room + start counting
  ${c.y("ccrank update")}                           pull the latest scripts (no re-join)
  ${c.y("ccrank status")}                           show your current rank
  ${c.y("ccrank leave")}                            remove the hooks

  Options:
    --server <url>    point at a different ccrank server
                      (or set CCRANK_SERVER)
`);
}

const table = { create, join: joinRoom, update, status, leave, help };
Promise.resolve((table[cmd] || help)()).catch((e) => fail(e.message));
