// ccrank auto-update — the "never lift a finger" pipe. Once a day, whichever
// of the hook / statusline ticks first asks the server which version of the
// client is current; if it isn't the one recorded as applied, it spawns
// `npx -y mostcracked@<version> update` detached in the background. That
// re-runs the installer: fresh scripts into ~/.ccrank, hooks rewired, and the
// one-time backfill offered — all with zero user action.
//
// Security shape (the old curl-style self-updater was removed on purpose in
// the hardening pass; this is its replacement): the package name is
// HARD-PINNED here, so the server only ever names WHICH version of OUR npm
// package to run — it can never point users at other code. Install goes
// through the npm registry, same trust as the original `npx mostcracked`
// install.

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const STATE = join(homedir(), ".ccrank", "update.json");
const PKG = "mostcracked"; // pinned — never comes from the server
// Every ~3h. Cheap: the check is one 1.5s-bounded GET, and /api/client-version
// is cached an hour server-side, so this is ~8 tiny requests per user per day.
// Actual update spawns stay gated on version !== appliedVersion — they're
// bounded by how often we publish, not by how often we check.
const CHECK_EVERY_MS = 3 * 60 * 60 * 1000;

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

function state() {
  try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return {}; }
}
function save(patch) {
  try { writeFileSync(STATE, JSON.stringify({ ...state(), ...patch })); } catch {}
}

// Record which version is installed. Written by `ccrank update
// --applied-version` (exact) and best-effort after any install, so a fresh
// install at the latest version doesn't trigger a pointless update spawn the
// next day. Also still accepts the legacy 40-hex sha the pre-npm auto-updater
// passes via `update --applied-sha` — harmless, keeps the transition quiet.
export function recordApplied(v) {
  const s = String(v);
  if (SEMVER.test(s)) save({ appliedVersion: s, appliedAt: Date.now() });
  else if (/^[0-9a-f]{7,40}$/.test(s)) save({ appliedSha: s, appliedAt: Date.now() });
}

export async function maybeAutoUpdate(server) {
  const st = state();
  const now = Date.now();
  if (!server || now - (st.checkedAt || 0) < CHECK_EVERY_MS) return;
  // Slam the door BEFORE the network call so concurrent hook/statusline ticks
  // (or several open sessions) can't double-run the check.
  save({ checkedAt: now });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(String(server).replace(/\/$/, "") + "/api/client-version", { signal: ctrl.signal });
    const v = String((await res.json())?.version || "");
    if (!SEMVER.test(v) || v === st.appliedVersion) return;
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["-y", `${PKG}@${v}`, "update", "--applied-version", v],
      { detached: true, stdio: "ignore", shell: process.platform === "win32" });
    child.on("error", () => {});
    child.unref();
  } catch {
    /* offline / slow — the next daily window retries */
  } finally { clearTimeout(timer); }
}
