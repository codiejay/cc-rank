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
const DEFAULT_SERVER = process.env.CCRANK_SERVER || "https://ccrank.ccrank.workers.dev";

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
  const owner = flags.by || null; // shown to friends when they join: "NAME invited you"
  let created;
  try {
    created = await api("/api/rooms", "POST", { name, owner });
  } catch (e) {
    if (e.message === "room_name_taken") {
      console.error(`\n  A room named ${c.y(name)} already exists — room names must be unique.`);
      console.error(`  Pick a different name and try again.\n`);
      process.exitCode = 1;
      return;
    }
    throw e;
  }
  const { code } = created;
  console.log(`\n  ${c.g("✓")} Room created: ${c.b(name)}${owner ? c.dim(` (by ${owner})`) : ""}`);
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
  let res;
  if (rejoining) {
    res = { token: prev.token, playerId: prev.playerId, name: prev.name,
            roomCode: prev.roomCode, roomName: prev.roomName };
  } else {
    try {
      res = await api(`/api/rooms/${code}/join`, "POST", { name, recovery: flags.recover || null });
    } catch (e) {
      if (e.message === "name_taken") {
        console.error(`\n  The name ${c.y(name)} is already taken in this room.`);
        console.error(`  If that's you (new machine or lost config), rejoin with your recovery code:`);
        console.error(`    ${c.b(`npx github:codiejay/cc-rank join ${code} --name ${name} --recover XXXX-XXXX`)}`);
        console.error(c.dim(`  (it was printed when you first joined; or run "ccrank recovery" on your old machine)`));
        console.error(`  Otherwise, just pick a different name.\n`);
        process.exitCode = 1;
        return;
      }
      throw e;
    }
  }
  const useServer = rejoining ? prev.server : server;

  installScripts();
  const { settings, wrapped } = wireClaude();

  saveConfig({
    server: useServer, token: res.token, playerId: res.playerId,
    name: res.name, roomCode: res.roomCode, roomName: res.roomName,
    recoveryCode: res.recoveryCode || prev?.recoveryCode || null,
    wrappedStatusLine: wrapped || null,
  });
  mkdirSync(dirname(CLAUDE_SETTINGS), { recursive: true });
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(settings, null, 2));

  const verb = rejoining ? "Re-synced" : res.reclaimed ? "Welcome back to" : "Joined";
  console.log(`\n  ${c.g("✓")} ${verb} ${c.b(res.roomName)} as ${c.y(res.name)}`);
  if (res.reclaimed && !rejoining) {
    console.log(`  Found your existing player — your score carries over from before.`);
  } else if (!rejoining) {
    const who = res.owner ? `${c.b(res.owner)} invited you to` : `You're in`;
    console.log(`  ${who} a friendly Claude Code leaderboard.`);
    console.log(`  Every prompt you send and file edit Claude makes scores you a point.`);
    console.log(`  Only counts leave your machine — ${c.b("never your code")}.`);
  }
  console.log(`\n  Live standings:  ${c.y(useServer + "/r/" + code)}`);
  console.log(`  What is ccrank?  ${c.dim("https://github.com/codiejay/cc-rank")}`);
  if (res.recoveryCode) {
    console.log(`\n  Recovery code:   ${c.b(res.recoveryCode)}  ${c.dim("(save it — needed to rejoin as " + res.name + " from a new machine)")}`);
  }
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

// Mint a (new) recovery code for the current player — for people who joined
// before recovery codes existed, or who lost theirs. Requires being signed in.
async function recovery() {
  const cfg = loadConfig();
  if (!cfg?.token) return fail("Not in a room yet. Run: ccrank join <CODE> --name YOU");
  const { recoveryCode } = await api("/api/recovery", "POST", { token: cfg.token });
  saveConfig({ ...cfg, recoveryCode });
  console.log(`\n  ${c.g("✓")} Recovery code for ${c.y(cfg.name)}: ${c.b(recoveryCode)}`);
  console.log(c.dim(`  Save it. To rejoin from a new machine:`));
  console.log(`    ${c.b(`npx github:codiejay/cc-rank join ${cfg.roomCode} --name ${cfg.name} --recover ${recoveryCode}`)}\n`);
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

  ${c.y("ccrank create")} --name "Room name" --by YOU   create a room, get a code
  ${c.y("ccrank join")} <CODE> --name YOU           join a room + start counting
  ${c.y("ccrank update")}                           pull the latest scripts (no re-join)
  ${c.y("ccrank status")}                           show your current rank
  ${c.y("ccrank recovery")}                         mint a recovery code (rejoin from a new machine)
  ${c.y("ccrank leave")}                            remove the hooks

  Options:
    --server <url>    point at a different ccrank server
                      (or set CCRANK_SERVER)
`);
}

const table = { create, join: joinRoom, update, status, recovery, leave, help };
Promise.resolve((table[cmd] || help)()).catch((e) => fail(e.message));
