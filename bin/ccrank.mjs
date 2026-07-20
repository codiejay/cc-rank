#!/usr/bin/env node
// ccrank CLI — sign in with GitHub, create/join rooms, and (un)install the
// Claude Code hooks. Zero dependencies, no build step.
//
// USER-PRIMARY model: your GitHub account is the identity; all your prompts
// and edits form ONE global stream. Rooms are just groupings you're a member of.
//
// Identity is REAL GitHub auth: we get a GitHub access token (from the gh CLI
// if you're signed in, else GitHub's device flow) and the server verifies it
// with api.github.com before minting a session. No username squatting possible.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, "..");
const CC_DIR = join(homedir(), ".ccrank");                 // our config + hook scripts live here
const CFG = join(CC_DIR, "config.json");
const CLAUDE_SETTINGS = join(homedir(), ".claude", "settings.json");
const CODEX_HOOKS = join(homedir(), ".codex", "hooks.json"); // Codex reads lifecycle hooks here

// Default server. Overridable with --server <url> or CCRANK_SERVER env.
const DEFAULT_SERVER = process.env.CCRANK_SERVER || "https://ccrank.ccrank.workers.dev";

// GitHub OAuth app client id for the device flow (public by design, not a
// secret — it only identifies the "ccrank" OAuth app). Overridable for forks.
const GH_CLIENT_ID = process.env.CCRANK_GH_CLIENT_ID || "Ov23lipQUJVMvnQ2gTh2";

// ---- tiny arg parsing ----------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[++i];
  else pos.push(rest[i]);
}
const server = (flags.server || DEFAULT_SERVER).replace(/\/$/, "");

// Which coding agent(s) to wire: 'claude' (default), 'codex', or 'both'.
// Scores merge across agents; this only decides which config files we touch.
// An explicit --agent wins; otherwise reuse whatever was installed before (so
// `ccrank update` on a codex/both setup doesn't silently drop back to claude).
const AGENT = ["claude", "codex", "both"].includes(flags.agent)
  ? flags.agent
  : (loadConfig()?.agent || "claude");
const wantClaude = AGENT === "claude" || AGENT === "both";
const wantCodex = AGENT === "codex" || AGENT === "both";
const agentLabel = AGENT === "codex" ? "Codex" : AGENT === "both" ? "Claude Code and Codex" : "Claude Code";
function restartMsg() {
  return c.dim(`  Restart ${agentLabel} (or open a new session) to activate.\n`);
}

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

// Personalized board URL: ?me=<github_id> lets the dashboard highlight the
// viewer's own row. The id is PUBLIC (it's in every leaderboard row) and only
// drives a cosmetic highlight — never put tokens or secrets in URLs.
function withMe(url, cfg) {
  if (!cfg?.githubId) return url;
  return url + (url.includes("?") ? "&" : "?") + "me=" + cfg.githubId;
}

// Best-effort "open in browser" — silent on failure (SSH/headless/CI), the
// printed link always covers those cases.
function openBrowser(url) {
  try {
    const [bin, args] = process.platform === "darwin" ? ["open", [url]]
      : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
      : ["xdg-open", [url]];
    const child = spawn(bin, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch { return false; }
}

// ---- GitHub auth ---------------------------------------------------------

// Shortcut: you're signed into the gh CLI — its token identifies you without
// the browser step. We OFFER it; device flow remains the canonical path.
function ghCliToken() {
  try {
    const out = execSync("gh auth token", { stdio: ["ignore", "pipe", "ignore"], timeout: 4000 })
      .toString().trim();
    return /^(gho|ghp|ghu|github_pat)_[A-Za-z0-9_]+$/.test(out) ? out : null;
  } catch { return null; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One y/n question on the terminal; non-interactive runs take the default.
async function askYesNo(question, def = true) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return def;
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const a = (await rl.question(`  ${question} ${def ? "[Y/n]" : "[y/N]"} `)).trim().toLowerCase();
    return a === "" ? def : a === "y" || a === "yes";
  } finally { rl.close(); }
}

// Copy text to the OS clipboard, best-effort and silent on failure.
function toClipboard(text) {
  try {
    const [bin, args] = process.platform === "darwin" ? ["pbcopy", []]
      : process.platform === "win32" ? ["clip", []]
      : ["xclip", ["-selection", "clipboard"]];
    const child = spawn(bin, args, { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", () => {});
    child.stdin.on("error", () => {});
    child.stdin.write(text); child.stdin.end();
    return true;
  } catch { return false; }
}

// GitHub device flow. The CLI does ALL the legwork itself — opens the GitHub
// page in the browser AND puts the code in the clipboard — so the user just
// pastes and clicks. The printed code is the fallback for SSH/headless.
// scope read:user: public profile only; can't touch code, repos, or orgs.
async function deviceFlowToken() {
  const start = await (await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: GH_CLIENT_ID, scope: "read:user" }),
  })).json();
  if (!start?.device_code) { fail("Could not start GitHub sign-in. Try again."); return null; }

  const uri = start.verification_uri || "https://github.com/login/device";
  const copied = toClipboard(start.user_code);
  const opened = openBrowser(uri);
  // Native notification so the code reaches the user even if this output is
  // buried (e.g. an agent ran us in the background and forgot to relay it).
  if (process.platform === "darwin") {
    try {
      const note = `Code ${start.user_code} ${copied ? "copied, just paste it" : ""} on the GitHub page`;
      spawn("osascript", ["-e",
        `display notification ${JSON.stringify(note)} with title "ccrank" subtitle "GitHub sign-in"`],
        { detached: true, stdio: "ignore" }).unref();
    } catch { /* cosmetic */ }
  }
  console.log(`\n  Sign in with GitHub to prove who you are.`);
  if (opened) console.log(`  ${c.g("✓")} GitHub just opened in your browser.${copied ? ` The code's in your clipboard, so just paste it.` : ""}`);
  console.log(`\n    Code:  ${c.y(start.user_code)}${copied ? c.dim("  (copied to clipboard)") : ""}`);
  console.log(`    Page:  ${c.b(uri)}${opened ? c.dim("  (already open)") : ""}`);
  console.log(c.dim(`\n  Tip: GitHub's green Authorize button wakes up after a second or two.`));
  console.log(c.dim(`  Waiting for you to authorize (Ctrl-C to abort)…`));

  let interval = (start.interval || 5) * 1000;
  const deadline = Date.now() + Math.min((start.expires_in || 900) * 1000, 10 * 60 * 1000);
  while (Date.now() < deadline) {
    await sleep(interval);
    const res = await (await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: GH_CLIENT_ID,
        device_code: start.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    })).json().catch(() => ({}));
    if (res.access_token) return res.access_token;
    if (res.error === "authorization_pending") continue;
    if (res.error === "slow_down") { interval += 5000; continue; }
    if (res.error === "access_denied") { fail("GitHub sign-in was denied."); return null; }
    if (res.error === "expired_token") break;
  }
  fail("GitHub sign-in timed out. Run the command again.");
  return null;
}

// Ensure we have a GitHub-verified session: reuse the saved one, else sign in.
// Returns the config object (NOT yet saved), or null on failure.
async function ensureUser({ force = false } = {}) {
  const prev = loadConfig();
  if (!force && prev?.token && prev?.login) return { ...prev, server: prev.server || server };

  let ghToken = null;
  const cliToken = ghCliToken();
  if (cliToken && (await askYesNo("You're signed into the gh CLI. Sign in to ccrank with it (skips the browser step)?"))) {
    ghToken = cliToken;
  }
  if (!ghToken) ghToken = await deviceFlowToken();
  if (!ghToken) return null;
  try {
    const res = await api("/api/login", "POST", { ghToken });
    return {
      server, token: res.token, githubId: res.githubId || null,
      login: res.login, avatar: res.avatar || null,
      reclaimed: !!res.reclaimed,
      roomCode: prev?.roomCode || null, roomName: prev?.roomName || null,
      wrappedStatusLine: prev?.wrappedStatusLine || null,
    };
  } catch (e) {
    if (e.message === "github_rejected") {
      fail(`GitHub didn't accept that sign-in. Try again (or "gh auth login" first if you use the gh CLI).`);
      return null;
    }
    throw e;
  }
}

// ---- install plumbing ----------------------------------------------------

// Copy hook.mjs + statusline.mjs into ~/.ccrank so Claude Code can run them.
function installScripts() {
  mkdirSync(CC_DIR, { recursive: true });
  for (const f of ["hook.mjs", "statusline.mjs"]) copyFileSync(join(PKG_ROOT, "lib", f), join(CC_DIR, f));
}

// Remove any ccrank hook entries from a settings/hooks object, in place. Run
// before re-adding so upgrades never leave a stale command behind (e.g. the
// old source-less `hook.mjs prompt` alongside the new `hook.mjs prompt claude`,
// which would double-count).
function purgeHooks(s) {
  for (const ev of Object.keys(s.hooks || {})) {
    s.hooks[ev] = (s.hooks[ev] || []).filter((g) => !JSON.stringify(g).includes("hook.mjs"));
    if (!s.hooks[ev].length) delete s.hooks[ev];
  }
}

// Build the two hook entries for a given agent's hook object. `source` is baked
// into the command so the same hook.mjs reports the right agent. `editMatcher`
// differs per agent (Codex edits are apply_patch).
function addHooks(s, source, editMatcher) {
  s.hooks ||= {};
  const hookCmd = (arg) => `node "${join(CC_DIR, "hook.mjs")}" ${arg} ${source}`;
  const push = (event, matcher, arg) => {
    s.hooks[event] ||= [];
    const entry = { hooks: [{ type: "command", command: hookCmd(arg) }] };
    if (matcher) entry.matcher = matcher;
    s.hooks[event].push(entry);
  };
  push("UserPromptSubmit", null, "prompt");
  push("PostToolUse", editMatcher, "edit");
}

// Merge our hooks (and statusline) into ~/.claude/settings.json, non-destructively.
function wireClaude() {
  let s = {};
  if (existsSync(CLAUDE_SETTINGS)) {
    try { s = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")); }
    catch { throw new Error(`Could not parse ${CLAUDE_SETTINGS}. Fix or move it, then re-run.`); }
  } else {
    mkdirSync(dirname(CLAUDE_SETTINGS), { recursive: true });
  }
  purgeHooks(s);
  addHooks(s, "claude", "Edit|Write|MultiEdit");

  // Statusline: preserve any existing one by wrapping it.
  const ourStatus = `node "${join(CC_DIR, "statusline.mjs")}"`;
  let wrapped = null;
  const existing = s.statusLine;
  if (existing && existing.command && !existing.command.includes("statusline.mjs")) {
    wrapped = existing.command; // first install: capture the user's real statusline
  } else if (existing && existing.command) {
    // Re-run: our statusline is already installed. Don't treat it as the
    // user's original — keep whatever original we captured the first time.
    wrapped = loadConfig()?.wrappedStatusLine || null;
  }
  s.statusLine = { type: "command", command: ourStatus };
  return { settings: s, wrapped };
}

// Merge our hooks into ~/.codex/hooks.json (same schema as Claude's, JSON so no
// TOML editing). Codex edits go through apply_patch. No statusline concept.
function wireCodex() {
  let s = {};
  if (existsSync(CODEX_HOOKS)) {
    try { s = JSON.parse(readFileSync(CODEX_HOOKS, "utf8")); }
    catch { throw new Error(`Could not parse ${CODEX_HOOKS}. Fix or move it, then re-run.`); }
  } else {
    mkdirSync(dirname(CODEX_HOOKS), { recursive: true });
  }
  purgeHooks(s);
  addHooks(s, "codex", "apply_patch|Edit|Write");
  return s;
}

function finishInstall(cfg) {
  installScripts();
  let wrapped = cfg.wrappedStatusLine ?? null;
  if (wantClaude) {
    const res = wireClaude();
    wrapped = res.wrapped ?? wrapped;
    mkdirSync(dirname(CLAUDE_SETTINGS), { recursive: true });
    writeFileSync(CLAUDE_SETTINGS, JSON.stringify(res.settings, null, 2));
  }
  if (wantCodex) {
    const cs = wireCodex();
    mkdirSync(dirname(CODEX_HOOKS), { recursive: true });
    writeFileSync(CODEX_HOOKS, JSON.stringify(cs, null, 2));
  }
  saveConfig({ ...cfg, agent: AGENT, wrappedStatusLine: wrapped });
  return wrapped;
}

// ---- commands ------------------------------------------------------------

// Sign in with GitHub and get on the GLOBAL board — no room needed. Also the
// "new machine" path: GitHub itself is the recovery, so just log in again.
async function login() {
  const cfg = await ensureUser({ force: true });
  if (!cfg) return;
  const wrapped = finishInstall(cfg);
  console.log(`\n  ${c.g("✓")} Signed in as ${c.y(cfg.login)} ${c.dim("(verified by GitHub)")}`);
  console.log(`  You're on the global board. Every prompt you send and every file`);
  console.log(`  Claude edits scores you a point. Only counts leave your machine, ${c.b("never your code")}.`);
  // Send them straight to their board — room if they have one, else global.
  // The ?me= link is always printed too (SSH/headless can't pop a browser).
  const boardUrl = withMe(cfg.roomCode ? cfg.server + "/r/" + cfg.roomCode : cfg.server + "/", cfg);
  const opened = openBrowser(boardUrl);
  console.log(`\n  Your board${opened ? " (opening in your browser)" : ""}:`);
  console.log(`  ${c.y(boardUrl)}`);
  if (!cfg.roomCode) console.log(`\n  Want a private room for your crew? ${c.dim("ccrank create --name \"Room\"  ·  ccrank join <CODE>")}`);
  if (wrapped) console.log(c.dim(`  (kept your existing statusline; rank is appended to it)`));
  console.log(restartMsg());
}

async function create() {
  const name = flags.name || pos[0] || "My room";
  const cfg = await ensureUser();
  if (!cfg) return;
  let created;
  try {
    created = await api("/api/rooms", "POST", { token: cfg.token, name });
  } catch (e) {
    if (e.message === "room_name_taken") {
      console.error(`\n  A room named ${c.y(name)} already exists. Room names must be unique.`);
      console.error(`  Pick a different name and try again.\n`);
      process.exitCode = 1;
      return;
    }
    throw e;
  }
  const { code } = created;
  // Creating auto-joins you, so wire everything up right away.
  const wrapped = finishInstall({ ...cfg, roomCode: code, roomName: name });

  console.log(`\n  ${c.g("✓")} Signed in as ${c.y(cfg.login)} ${c.dim("(verified by GitHub)")}`);
  console.log(`  ${c.g("✓")} Room created: ${c.b(name)}. You're in it.`);
  // Auto-open the room page: shows the board AND teaches this browser the
  // room code so the site's sidebar can link it from now on.
  const roomUrl = withMe(cfg.server + "/r/" + code, cfg);
  const opened = openBrowser(roomUrl);
  console.log(`  Code:      ${c.y(code)}`);
  console.log(`  Dashboard${opened ? " (opening)" : ""}: ${c.dim(roomUrl)}`);
  console.log(`\n  Invite friends. Each of them runs:`);
  console.log(`    ${c.b(`npx github:codiejay/cc-rank join ${code}`)}\n`);
  if (wrapped) console.log(c.dim(`  (kept your existing statusline; rank is appended to it)`));
  console.log(restartMsg());
}

async function joinRoom() {
  const code = (pos[0] || flags.code || "").toUpperCase();
  if (!code) return fail("Usage: ccrank join <ROOM_CODE>");

  const cfg = await ensureUser();
  if (!cfg) return;
  let res;
  try {
    res = await api(`/api/rooms/${code}/join`, "POST", { token: cfg.token });
  } catch (e) {
    if (e.message === "invalid token") {
      // Saved session no longer valid (server reset / signed in elsewhere) —
      // wipe it; GitHub is the recovery, so signing in again fixes everything.
      saveConfig({ ...cfg, token: null, login: null });
      return fail(`Your saved session expired. Run "ccrank login" (or this command again) to sign back in with GitHub.`);
    }
    if (e.message === "room not found") return fail(`No room answers to ${code}. Double-check the code.`);
    throw e;
  }

  const wrapped = finishInstall({ ...cfg, roomCode: res.roomCode, roomName: res.roomName });

  console.log(`\n  ${c.g("✓")} Signed in as ${c.y(cfg.login)} ${c.dim("(verified by GitHub)")}`);
  console.log(`  ${c.g("✓")} Joined ${c.b(res.roomName)}`);
  const who = res.owner ? `${c.b(res.owner)} invited you to` : `You're in`;
  console.log(`  ${who} a private room on the global ccrank board.`);
  console.log(`  Every prompt you send and every file Claude edits scores you a point.`);
  console.log(`  One global score that follows you into every room. Only counts leave`);
  console.log(`  your machine, ${c.b("never your code")}.`);
  // Auto-open the room page: shows the board AND teaches this browser the
  // room code so the site's sidebar can link it from now on.
  const roomUrl = withMe(cfg.server + "/r/" + code, cfg);
  const opened = openBrowser(roomUrl);
  console.log(`\n  Room board${opened ? " (opening)" : ""}:  ${c.y(roomUrl)}`);
  console.log(`  Global board:    ${c.dim(withMe(cfg.server + "/", cfg))}`);
  console.log(`  What is ccrank?  ${c.dim("https://github.com/codiejay/cc-rank")}`);
  if (wrapped) console.log(c.dim(`  (kept your existing statusline; rank is appended to it)`));
  console.log(restartMsg());
}

// Pull the latest hook/statusline scripts — no re-auth, same user, counts untouched.
async function update() {
  const cfg = loadConfig();
  if (!cfg?.token) return fail("Not signed in yet. Run: ccrank join <CODE>");
  finishInstall(cfg);
  console.log(`\n  ${c.g("✓")} Updated to the latest ccrank scripts.`);
  console.log(restartMsg());
}

async function status() {
  const cfg = loadConfig();
  if (!cfg?.token) return console.log("Not signed in yet. Run: ccrank join <CODE>");
  try {
    const me = await api(`/api/me?token=${encodeURIComponent(cfg.token)}`);
    console.log(`\n  ${c.y(me.login)} ${c.dim("·")} global rank ${c.b("#" + me.rank + "/" + me.total)}, score ${c.g(me.score)}`);
    for (const r of me.rooms || []) {
      console.log(`  ${c.dim("room")} ${c.b(r.name)} ${c.dim("· " + cfg.server + "/r/" + r.code)}`);
    }
    console.log(`  ${c.dim(cfg.server + "/")}\n`);
  } catch (e) { fail(e.message); }
}

function leave() {
  // Remove our hooks from BOTH agents + restore any wrapped statusline. Leaves
  // config in place. Idempotent — safe to run whatever was installed.
  const cfg = loadConfig();
  if (existsSync(CLAUDE_SETTINGS)) {
    const s = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8"));
    purgeHooks(s);
    if (s.statusLine?.command?.includes("statusline.mjs")) {
      if (cfg?.wrappedStatusLine) s.statusLine = { type: "command", command: cfg.wrappedStatusLine };
      else delete s.statusLine;
    }
    writeFileSync(CLAUDE_SETTINGS, JSON.stringify(s, null, 2));
  }
  if (existsSync(CODEX_HOOKS)) {
    const s = JSON.parse(readFileSync(CODEX_HOOKS, "utf8"));
    purgeHooks(s);
    writeFileSync(CODEX_HOOKS, JSON.stringify(s, null, 2));
  }
  console.log(`  ${c.g("✓")} Removed ccrank hooks. Restart your agent to finish.`);
}

function fail(msg) { console.error(`  ${msg}`); process.exitCode = 1; }

function help() {
  console.log(`
  ${c.b("ccrank")} is the global leaderboard for Claude Code and Codex. Every
  prompt and edit scores a point. Sign in with GitHub and you're on the board
  with every ccrank user. Rooms are optional private groups viewing the same
  scores. Use both agents? Your scores merge into one; the board marks Codex.

  ${c.y("ccrank login")}                   sign in with GitHub, get on the global board
  ${c.y("ccrank join")} <CODE>              join a private room (logs you in if needed)
  ${c.y("ccrank create")} --name "Room"    create a room, auto-joins you (logs in if needed)
  ${c.y("ccrank update")}                  pull the latest scripts (no re-auth)
  ${c.y("ccrank status")}                  show your global rank + rooms
  ${c.y("ccrank leave")}                   remove the hooks (both agents)

  Sign-in is GitHub device flow: you enter a one-time code at
  github.com/login/device (or reuse your gh CLI session if it's signed in).
  Scope read:user, public profile only. New machine? Just "ccrank login" again.

  Options:
    --agent <which>   which agent to wire: claude (default), codex, or both.
                      Claude hooks -> ~/.claude/settings.json; Codex hooks ->
                      ~/.codex/hooks.json.
    --server <url>    point at a different ccrank server (or set CCRANK_SERVER)
`);
}

const table = { login, create, join: joinRoom, update, status, leave, help };
Promise.resolve((table[cmd] || help)()).catch((e) => fail(e.message));
