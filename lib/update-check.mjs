// ccrank auto-update — the "never lift a finger" pipe. Once a day, whichever
// of the hook / statusline ticks first asks the server which commit of the
// client is current; if it isn't the one recorded as applied, it spawns
// `npx github:codiejay/cc-rank#<sha> update` detached in the background. That
// re-runs the installer: fresh scripts into ~/.ccrank, hooks rewired, and the
// one-time backfill offered — all with zero user action.
//
// Security shape (the old curl-style self-updater was removed on purpose in
// the hardening pass; this is its replacement): the repo is HARD-PINNED here,
// so the server only ever names WHICH commit of OUR repo to run — it can
// never point users at other code. Install goes through npm's own github:
// fetcher, same trust as the original `npx github:codiejay/cc-rank` install.

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const STATE = join(homedir(), ".ccrank", "update.json");
const REPO = "github:codiejay/cc-rank"; // pinned — never comes from the server
// Every ~3h. Cheap: the check is one 1.5s-bounded GET, and /api/version is
// cached an hour server-side, so this is ~8 tiny requests per user per day.
// Actual update spawns stay gated on sha !== appliedSha — they're bounded by
// how often we push, not by how often we check.
const CHECK_EVERY_MS = 3 * 60 * 60 * 1000;

function state() {
  try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return {}; }
}
function save(patch) {
  try { writeFileSync(STATE, JSON.stringify({ ...state(), ...patch })); } catch {}
}

// Record which commit is installed. Written by `ccrank update --applied-sha`
// (exact) and best-effort after any install, so a fresh install at the latest
// sha doesn't trigger a pointless update spawn the next day.
export function recordApplied(sha) {
  if (/^[0-9a-f]{7,40}$/.test(String(sha))) save({ appliedSha: String(sha), appliedAt: Date.now() });
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
    const res = await fetch(String(server).replace(/\/$/, "") + "/api/version", { signal: ctrl.signal });
    const sha = String((await res.json())?.sha || "");
    if (!/^[0-9a-f]{7,40}$/.test(sha) || sha === st.appliedSha) return;
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["-y", `${REPO}#${sha}`, "update", "--applied-sha", sha],
      { detached: true, stdio: "ignore", shell: process.platform === "win32" });
    child.on("error", () => {});
    child.unref();
  } catch {
    /* offline / slow — the next daily window retries */
  } finally { clearTimeout(timer); }
}
