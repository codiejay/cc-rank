import { Hono } from "hono";
import { cors } from "hono/cors";
import { dashboardHtml } from "./dashboard";
import { appleTouchIconBytes } from "./appleTouchIcon";
import { track } from "./analytics";

type Bindings = { DB: D1Database; OG_KV: KVNamespace };

const app = new Hono<{ Bindings: Bindings }>();
app.use("/api/*", cors());

// www + workers.dev -> apex, permanent: one canonical origin for links, OG
// cards, sessions (OAuth callbacks only know mostcracked.com), and SEO.
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.hostname.startsWith("www.") || url.hostname.endsWith(".workers.dev")) {
    url.hostname = "mostcracked.com";
    return c.redirect(url.toString(), 301);
  }
  await next();
});

// ---- helpers -------------------------------------------------------------

// Unambiguous alphabet (no O/0/I/1) for easy sharing over voice/text.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function roomCode(): string {
  let c = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) c += ALPHABET[b % ALPHABET.length];
  return c;
}
function utcDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}
const json = (c: any, data: unknown, status = 200) => c.json(data, status);

// Room codes use the unambiguous alphabet above, 1-6 chars. Used to validate
// the /r/:code path param before it is echoed into the dashboard HTML.
const CODE_RE = /^[A-Z2-9]{1,6}$/;

// SHA-256 (hex) of a token. Session tokens are stored HASHED so a DB leak
// can't be replayed as a live credential; the raw token lives only on the
// client. See /api/login and userByToken.
async function hashToken(t: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- rate limiting --------------------------------------------------------
// Per-isolate in-memory token bucket. Not perfect (each Worker isolate keeps
// its own counters), but it turns "try 890M room codes" from cheap into
// impractical, with zero added latency. Keyed by client IP + route class.
const rlHits = new Map<string, { n: number; t: number }>();
function rateLimited(c: any, key: string, max: number, windowMs = 60000): boolean {
  const ip = c.req.header("cf-connecting-ip") || "?";
  const k = ip + ":" + key;
  const now = Date.now();
  if (rlHits.size > 10000) {
    for (const [kk, v] of rlHits) if (now - v.t > windowMs) rlHits.delete(kk);
  }
  const h = rlHits.get(k);
  if (!h || now - h.t > windowMs) { rlHits.set(k, { n: 1, t: now }); return false; }
  h.n++;
  return h.n > max;
}
const tooMany = (c: any) => json(c, { error: "rate_limited" }, 429);

type User = { id: number; login: string };

async function userByToken(db: D1Database, token: string): Promise<User | null> {
  if (!token) return null;
  // Tokens are stored hashed — look up by the hash of what the client sent.
  return db.prepare("SELECT github_id AS id, login FROM users WHERE token = ?")
    .bind(await hashToken(token)).first<User>();
}

// ---- login ---------------------------------------------------------------

// Sign in with GitHub. The client sends a GitHub access token (obtained via
// device flow or the gh CLI); we ask GitHub whose token it is and trust ONLY
// that answer — never a client-supplied identity. Users are keyed on GitHub's
// immutable numeric id (rename-proof); login/avatar are display and refresh
// on every sign-in. The GitHub token is used once and never stored.
app.post("/api/login", async (c) => {
  if (rateLimited(c, "login", 10)) return tooMany(c);
  const body = await c.req.json().catch(() => ({}));
  const ghToken = String(body?.ghToken ?? "").trim();
  if (!ghToken) return json(c, { error: "gh_token_required" }, 400);

  let gh: { id: number; login: string; avatar_url: string | null };
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${ghToken}`,
        accept: "application/vnd.github+json",
        "user-agent": "ccrank",
      },
    });
    if (!res.ok) return json(c, { error: "github_rejected", status: res.status }, 401);
    const p = (await res.json()) as any;
    gh = { id: Number(p?.id), login: String(p?.login ?? ""), avatar_url: p?.avatar_url ?? null };
  } catch {
    return json(c, { error: "github_unreachable" }, 502);
  }
  if (!Number.isInteger(gh.id) || gh.id <= 0 || !gh.login) {
    return json(c, { error: "github_rejected" }, 401);
  }

  // The client keeps the RAW token; we only ever persist its hash. NOTE: this
  // change invalidates all pre-existing plaintext-token rows — those users must
  // sign in again to re-mint a (hashed) token. Accepted, pre-approved break.
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const tokenHash = await hashToken(token);
  const existing = await c.env.DB.prepare(
    "SELECT github_id FROM users WHERE github_id = ?"
  ).bind(gh.id).first();

  if (existing) {
    // Same person, new machine/session — re-mint our token, refresh display.
    await c.env.DB.prepare(
      "UPDATE users SET token = ?, login = ?, avatar = ? WHERE github_id = ?"
    ).bind(tokenHash, gh.login, gh.avatar_url, gh.id).run();
    track(c, "login", { githubId: gh.id, props: { login: gh.login } });
    return json(c, { token, githubId: gh.id, login: gh.login, avatar: gh.avatar_url, reclaimed: true });
  }
  await c.env.DB.prepare(
    "INSERT INTO users (github_id, login, avatar, token, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(gh.id, gh.login, gh.avatar_url, tokenHash, Date.now()).run();
  track(c, "signup", { githubId: gh.id, props: { login: gh.login } });
  return json(c, { token, githubId: gh.id, login: gh.login, avatar: gh.avatar_url, reclaimed: false });
});

// Public display fields for a github_id — lets the dashboard greet the viewer
// identified by the (public, cosmetic) ?me= param. No token, no secrets.
app.get("/api/whois", async (c) => {
  const id = Number(c.req.query("me"));
  if (!Number.isInteger(id) || id <= 0) return json(c, { error: "bad_id" }, 400);
  const u = await c.env.DB.prepare(
    "SELECT github_id AS id, login, avatar FROM users WHERE github_id = ?"
  ).bind(id).first();
  if (!u) return json(c, { error: "unknown" }, 404);
  return json(c, u);
});

// ---- rooms ---------------------------------------------------------------

// Create a room -> returns its code. Auth via user token; the creator is
// auto-joined (a room with zero members is useless).
app.post("/api/rooms", async (c) => {
  if (rateLimited(c, "createroom", 10)) return tooMany(c);
  const body = await c.req.json().catch(() => ({}));
  const user = await userByToken(c.env.DB, String(body?.token ?? ""));
  if (!user) return json(c, { error: "invalid token" }, 401);
  const name = String(body?.name ?? "").trim().slice(0, 60) || "Untitled room";
  const now = Date.now();

  // Room names are globally unique (case-insensitive) so a shared code always
  // maps to one obvious room. Reject a duplicate instead of silently making two.
  const dup = await c.env.DB.prepare("SELECT code FROM rooms WHERE lower(name) = lower(?)")
    .bind(name).first();
  if (dup) return json(c, { error: "room_name_taken" }, 409);

  // Retry a couple of times in the (astronomically unlikely) event of a collision.
  for (let i = 0; i < 5; i++) {
    const code = roomCode();
    try {
      await c.env.DB.batch([
        c.env.DB.prepare("INSERT INTO rooms (code, name, owner, created_at) VALUES (?, ?, ?, ?)")
          .bind(code, name, user.login, now),
        c.env.DB.prepare("INSERT INTO memberships (user_id, room_code, joined_at) VALUES (?, ?, ?)")
          .bind(user.id, code, now),
      ]);
      track(c, "room_create", { githubId: user.id, props: { code } });
      return json(c, { code, name, owner: user.login });
    } catch (e) {
      // The unique index on lower(name) can fire between our pre-check and the
      // INSERT (concurrent create). Distinguish it from a code (PRIMARY KEY)
      // collision by the constraint named in the error: a name clash is
      // permanent (return taken), a code clash is retryable.
      const em = String((e as any)?.message ?? e ?? "");
      const isUnique = /UNIQUE|constraint/i.test(em);
      const isCode = /rooms\.code|\.code\b/i.test(em);
      if (isUnique && !isCode) return json(c, { error: "room_name_taken" }, 409);
      /* code collision (or unknown) — try again with a fresh code */
    }
  }
  return json(c, { error: "could not allocate room code" }, 500);
});

// Join a room = add a membership. Identity comes from the token; a room is
// just a grouping, so joining never touches counts.
app.post("/api/rooms/:code/join", async (c) => {
  // The brute-force target: joining/checking codes. Tight budget.
  if (rateLimited(c, "roomcode", 20)) return tooMany(c);
  const code = c.req.param("code").toUpperCase();
  const body = await c.req.json().catch(() => ({}));
  const user = await userByToken(c.env.DB, String(body?.token ?? ""));
  if (!user) return json(c, { error: "invalid token" }, 401);

  const room = await c.env.DB.prepare("SELECT code, name, owner FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string; owner: string | null }>();
  if (!room) return json(c, { error: "room not found" }, 404);

  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO memberships (user_id, room_code, joined_at) VALUES (?, ?, ?)"
  ).bind(user.id, code, Date.now()).run();
  track(c, "room_join", { githubId: user.id, props: { code } });
  return json(c, { login: user.login, roomCode: code, roomName: room.name, owner: room.owner });
});

// Pre-flight for JOIN: does the room exist?
app.get("/api/rooms/:code/check", async (c) => {
  if (rateLimited(c, "roomcode", 20)) return tooMany(c);
  const code = c.req.param("code").toUpperCase();
  const room = await c.env.DB.prepare("SELECT code, name FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string }>();
  if (!room) return json(c, { ok: false, reason: "room_not_found" });
  return json(c, { ok: true, roomName: room.name });
});

// Pre-flight for CREATE: is this room name still free (globally)?
app.get("/api/check-room", async (c) => {
  if (rateLimited(c, "checkroom", 60)) return tooMany(c);
  const name = String(c.req.query("name") ?? "").trim();
  if (!name) return json(c, { ok: false, reason: "empty" });
  const dup = await c.env.DB.prepare("SELECT code FROM rooms WHERE lower(name) = lower(?)")
    .bind(name).first();
  return json(c, { ok: !dup, reason: dup ? "room_name_taken" : null });
});

// ---- events --------------------------------------------------------------

// Record a batch of events. Auth via the user's token. Events belong to the
// USER only — one global stream, no room attribution.
app.post("/api/events", async (c) => {
  if (rateLimited(c, "events", 60)) return tooMany(c);
  const body = await c.req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  if (!token) return json(c, { error: "token required" }, 401);
  const user = await userByToken(c.env.DB, token);
  if (!user) return json(c, { error: "invalid token" }, 401);

  // Accept either a single event or {events:[...]}.
  const raw = Array.isArray(body?.events) ? body.events : [body];
  const now = Date.now();
  const day = utcDay(now);

  // Which agent sent these — 'codex' or the default 'claude'. Anything else
  // (older/forked clients, junk) falls back to 'claude'. Drives the board's
  // Codex mark; scores merge across agents regardless.
  const source = body?.source === "codex" ? "codex" : "claude";

  const stmt = c.env.DB.prepare(
    "INSERT INTO events (user_id, kind, value, day, ts, capped, source) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const parsed: { kind: string; value: number }[] = [];
  for (const e of raw.slice(0, 50)) {
    const kind = e?.kind === "edit" ? "edit" : e?.kind === "prompt" ? "prompt" : null;
    if (!kind) continue;
    const value = Math.max(1, Math.min(100000, Math.floor(Number(e?.value) || 1)));
    parsed.push({ kind, value });
  }
  // Two per-user per-UTC-day ceilings, set at insert time:
  //  - COUNTED cap (500/day): events beyond it are stored with capped = 1 and
  //    excluded from every score, board, badge, and chart. This is the
  //    anti-farming line — a shell loop can't buy points past lunch, and can
  //    never headline the weekly 25.
  //  - STORAGE cap (2000/day): beyond it we stop inserting entirely. Bounds
  //    abuse and runaway clients.
  if (parsed.length) {
    const counts = (await c.env.DB.prepare(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN capped = 0 THEN 1 ELSE 0 END) AS counted
      FROM events WHERE user_id = ? AND day = ?`
    ).bind(user.id, day).first<{ total: number; counted: number | null }>()) ??
      { total: 0, counted: 0 };
    const total = counts.total, counted = counts.counted ?? 0;
    let countedLeft = Math.max(0, 500 - counted);
    const batch = [];
    for (const e of parsed.slice(0, Math.max(0, 2000 - total))) {
      const capped = countedLeft > 0 ? 0 : 1;
      if (capped === 0) countedLeft--;
      batch.push(stmt.bind(user.id, e.kind, e.value, day, now, capped, source));
    }
    if (batch.length) await c.env.DB.batch(batch);
  }
  return json(c, { ok: true, recorded: parsed.length });
});

// ---- version ---------------------------------------------------------------
// Which commit of the client is current — feeds the daily auto-update check in
// the installed hook/statusline (update-check.mjs). The client pins the repo;
// we only ever name a sha, so this can't redirect anyone to other code.
// KV-cached 1h so GitHub's unauthenticated rate limit is never a factor.
let verMemo = { at: 0, sha: "" };
app.get("/api/version", async (c) => {
  if (verMemo.sha && Date.now() - verMemo.at < 3600_000) return json(c, { sha: verMemo.sha });
  let sha = (await c.env.OG_KV.get("client:sha")) || "";
  if (!sha) {
    try {
      const res = await fetch("https://api.github.com/repos/codiejay/cc-rank/commits/main", {
        headers: { accept: "application/vnd.github+json", "user-agent": "ccrank" },
      });
      if (res.ok) sha = String(((await res.json()) as any)?.sha || "");
    } catch { /* fall through */ }
    if (!/^[0-9a-f]{40}$/.test(sha)) sha = "";
    if (sha) c.executionCtx.waitUntil(c.env.OG_KV.put("client:sha", sha, { expirationTtl: 3600 }));
  }
  if (!sha) return json(c, { error: "unavailable" }, 503);
  verMemo = { at: Date.now(), sha };
  return json(c, { sha });
});

// ---- backfill --------------------------------------------------------------
// One-time import of a new user's last 7 days of LOCAL Claude Code history
// (the CLI scans ~/.claude/projects transcripts and sends per-day counts).
// Solves the "new entry always debuts at the bottom" cold start without
// self-report: same trust level as the hooks (client-derived counts), but
// hard server rules keep it honest:
//   1. once per GitHub account, EVER (backfills row is the lock)
//   2. only full past days inside the last 7 — never today (hooks own today)
//   3. only days the user has ZERO tracked events on (no double counting)
//   4. the normal 500/day counted cap applies; excess is dropped, not stored
// ts lands at 12:00 UTC so backfilled events can never farm night owl.
app.post("/api/backfill", async (c) => {
  if (rateLimited(c, "backfill", 5)) return tooMany(c);
  const body = await c.req.json().catch(() => ({}));
  const user = await userByToken(c.env.DB, String(body?.token ?? ""));
  if (!user) return json(c, { error: "invalid token" }, 401);

  const now = Date.now();
  const today = utcDay(now);
  const minDay = utcDay(now - 7 * 86400000);
  const clamp = (v: unknown, max: number) =>
    Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

  const seen = new Set<string>();
  const days: { day: string; prompts: number; edits: number; lines: number }[] = [];
  for (const d of (Array.isArray(body?.days) ? body.days : []).slice(0, 10)) {
    const day = String(d?.day ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < minDay || day >= today || seen.has(day)) continue;
    seen.add(day);
    const prompts = clamp(d?.prompts, 1000);
    const edits = clamp(d?.edits, 1000);
    const lines = clamp(d?.lines, 200000);
    if (prompts + edits > 0) days.push({ day, prompts, edits, lines });
  }
  if (!days.length) return json(c, { ok: true, days: 0, prompts: 0, edits: 0 });

  // Claim the once-ever lock FIRST (PK insert = atomic), so two concurrent
  // requests can't both insert events. Real counts are patched in at the end.
  const lock = await c.env.DB.prepare(
    "INSERT OR IGNORE INTO backfills (user_id, at, days, prompts, edits) VALUES (?, ?, 0, 0, 0)"
  ).bind(user.id, now).run();
  if (!lock.meta.changes) return json(c, { error: "already_backfilled" }, 409);

  // Rule 3: a day with ANY existing event for this user is skipped whole.
  const existing = await Promise.all(days.map((d) =>
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND day = ?")
      .bind(user.id, d.day).first<{ n: number }>()));

  const ins = c.env.DB.prepare(
    "INSERT INTO events (user_id, kind, value, day, ts, capped, source) VALUES (?, ?, ?, ?, ?, 0, 'claude')");
  const stmts: D1PreparedStatement[] = [];
  let recPrompts = 0, recEdits = 0, recDays = 0;
  for (let i = 0; i < days.length; i++) {
    if ((existing[i]?.n ?? 1) > 0) continue;
    const d = days[i];
    const ts = Date.parse(d.day + "T12:00:00Z");
    let left = 500; // rule 4: the day is empty, so the full counted budget
    const p = Math.min(d.prompts, left); left -= p;
    const e = Math.min(d.edits, left);
    // Spread claimed lines evenly across the edit rows we actually insert.
    const perEdit = e > 0 ? Math.max(1, Math.round(d.lines / d.edits)) : 0;
    for (let k = 0; k < p; k++) stmts.push(ins.bind(user.id, "prompt", 1, d.day, ts));
    for (let k = 0; k < e; k++) stmts.push(ins.bind(user.id, "edit", perEdit, d.day, ts));
    if (p + e > 0) { recPrompts += p; recEdits += e; recDays++; }
  }
  for (let i = 0; i < stmts.length; i += 90) await c.env.DB.batch(stmts.slice(i, i + 90));
  await c.env.DB.prepare(
    "UPDATE backfills SET days = ?, prompts = ?, edits = ? WHERE user_id = ?"
  ).bind(recDays, recPrompts, recEdits, user.id).run();
  return json(c, { ok: true, days: recDays, prompts: recPrompts, edits: recEdits });
});

// ---- usage (tokens / $) ----------------------------------------------------
// USAGE_EST: board rows show ~tokens + ~$ per user. REAL cost lives in
// usage_sessions (statusline reports, Claude Code only) and only exists from
// USAGE_CUTOFF on. Everything before the cutoff — and all Codex events, which
// have no statusline — gets a flat estimate from event counts, so existing
// users don't start the column at zero. Constants are deliberately round
// (~20k tok per prompt turn, ~6k per edit, ~$2/Mtok blended for cache-heavy
// Claude Code traffic); the UI shows "~" on every number.
const USAGE_CUTOFF = "2026-07-22";
const EST_TOK_PER_PROMPT = 20_000;
const EST_TOK_PER_EDIT = 6_000;
const EST_USD_PER_MTOK = 2.0;

// The statusline posts {session_id, cost_usd} whenever the session's
// cumulative cost grows. MAX on conflict = idempotent, resume-safe, and a
// replayed old report can never shrink or double a total.
app.post("/api/usage", async (c) => {
  if (rateLimited(c, "usage", 30)) return tooMany(c);
  const body = await c.req.json().catch(() => ({}));
  const user = await userByToken(c.env.DB, String(body?.token ?? ""));
  if (!user) return json(c, { error: "invalid token" }, 401);
  const sid = String(body?.session_id ?? "");
  if (!/^[A-Za-z0-9._-]{8,64}$/.test(sid)) return json(c, { error: "bad_session" }, 400);
  const usd = Number(body?.cost_usd);
  // $2000 ceiling per session: far above any real session, cheap abuse cap.
  if (!Number.isFinite(usd) || usd <= 0 || usd > 2000) return json(c, { error: "bad_cost" }, 400);
  await c.env.DB.prepare(`
    INSERT INTO usage_sessions (user_id, session_id, cost_usd, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, session_id) DO UPDATE SET
      cost_usd = MAX(cost_usd, excluded.cost_usd), updated_at = excluded.updated_at`)
    .bind(user.id, sid, Math.round(usd * 100) / 100, Date.now()).run();
  return json(c, { ok: true });
});

// ---- boards --------------------------------------------------------------
// One implementation serves both boards. A board is always "users ranked by
// their GLOBAL activity"; a room merely filters WHICH users appear.

type BoardUser = { id: number; login: string; avatar: string | null; created_at: number };

// ---- badge definitions -----------------------------------------------------
// One source of truth for the nine badges: the live board crowns current
// holders from these, and the day-records finalizer replays the exact same
// predicates against cumulative stats as of each past day-end. Floors are
// hard qualification gates — see the badge study.
type BStat = {
  id: number; prompts: number; edits: number; lines: number; total: number;
  bigDay: number; activeDays: number; countedDays: number; longestRun: number;
  weekendDays: number; weekendEvents: number; night: number;
};
const BADGE_DEFS: {
  key: string; label: string;
  qualifies: (s: BStat) => boolean; value: (s: BStat) => number; lowestWins?: boolean;
}[] = [
  { key: "oneshot",   label: "one-shot chief",  qualifies: (s) => s.prompts >= 25 && s.edits >= 50,  value: (s) => s.edits / s.prompts },
  { key: "conductor", label: "conductor",       qualifies: (s) => s.prompts >= 50 && s.edits >= 25,  value: (s) => s.prompts },
  { key: "lifter",    label: "heavy lifter",    qualifies: (s) => s.lines >= 2500 && s.edits >= 50,  value: (s) => s.lines },
  { key: "surgeon",   label: "surgeon",         qualifies: (s) => s.edits >= 75 && s.lines >= 500,   value: (s) => s.lines / s.edits, lowestWins: true },
  { key: "streak",    label: "streak",          qualifies: (s) => s.longestRun >= 3,                 value: (s) => s.longestRun },
  { key: "driver",    label: "daily driver",    qualifies: (s) => s.countedDays >= 5,                value: (s) => s.countedDays },
  { key: "bigday",    label: "big day",         qualifies: (s) => s.bigDay >= 150,                   value: (s) => s.bigDay },
  { key: "owl",       label: "night owl",
    qualifies: (s) => s.night >= 50 && s.total >= 200 && s.night / s.total >= 0.15,                  value: (s) => s.night / s.total },
  { key: "weekend",   label: "weekend warrior",
    qualifies: (s) => s.weekendDays >= 3 && s.weekendEvents >= 100 && s.activeDays >= 5,             value: (s) => s.weekendEvents / s.total },
];
// One winner per badge over a stat population (ties: earliest account,
// matching the leaderboard rule).
function badgeHolders(stats: BStat[], createdAt: Map<number, number>) {
  const out: { key: string; label: string; id: number; value: number }[] = [];
  for (const d of BADGE_DEFS) {
    const pool = stats.filter(d.qualifies).sort(
      (a, b) => (d.lowestWins ? d.value(a) - d.value(b) : d.value(b) - d.value(a)) ||
        (createdAt.get(a.id) || 0) - (createdAt.get(b.id) || 0));
    if (pool.length) out.push({ key: d.key, label: d.label, id: pool[0].id, value: d.value(pool[0]) });
  }
  return out;
}

// ---- day records ("record history") ---------------------------------------
// Users asked for receipts: badges won stack up as ×N and a #1 day finish
// ("day one") leaves permanent evidence. At each UTC day boundary we snapshot
// who ENDED the day holding each badge plus the day's top scorer. Finalized
// lazily on first read after midnight — no cron; INSERT OR IGNORE on the
// (day, kind) PK makes concurrent finalizes safe; rows are immutable.
let recMemo = ""; // per-isolate: "already finalized through yesterday"
async function finalizeDayRecords(db: D1Database) {
  const yesterday = utcDay(Date.now() - 86400000);
  if (recMemo === yesterday) return;
  recMemo = yesterday; // one attempt per isolate per day, even if it fails
  const last = (await db.prepare("SELECT MAX(day) AS d FROM day_records").first()) as any;
  let start: string | null = last && last.d ? addDays(last.d, 1) : null;
  if (!start) {
    const first = (await db.prepare("SELECT MIN(day) AS d FROM events WHERE capped = 0").first()) as any;
    start = first && first.d ? first.d : null;
  }
  if (!start || start > yesterday) return;
  const [dayRows, userRows] = await Promise.all([
    db.prepare(`
      SELECT user_id AS id, day,
             SUM(CASE WHEN kind='prompt' THEN 1 ELSE 0 END) AS prompts,
             SUM(CASE WHEN kind='edit'   THEN 1 ELSE 0 END) AS edits,
             SUM(CASE WHEN kind='edit'   THEN value ELSE 0 END) AS lines,
             SUM(CASE WHEN CAST(strftime('%H', ts/1000, 'unixepoch') AS INTEGER) < 5 THEN 1 ELSE 0 END) AS night
      FROM events WHERE capped = 0 AND day <= ?
      GROUP BY user_id, day ORDER BY day ASC`).bind(yesterday).all(),
    db.prepare("SELECT github_id AS id, created_at FROM users").all(),
  ]);
  const createdAt = new Map((userRows.results as any[]).map((u) => [u.id, u.created_at] as [number, number]));
  const byDay = new Map<string, any[]>();
  for (const r of dayRows.results as any[]) {
    if (!byDay.has(r.day)) byDay.set(r.day, []);
    byDay.get(r.day)!.push(r);
  }
  const isWknd = (d: string) => { const w = new Date(d + "T00:00:00Z").getUTCDay(); return w === 0 || w === 6; };
  // Walk EVERY day from the first event so cumulative stats (streak runs,
  // weekend counts) are correct, but only write records for missing days.
  const cum = new Map<number, BStat & { lastCounted: string; run: number }>();
  const ins = db.prepare("INSERT OR IGNORE INTO day_records (day, kind, user_id, value) VALUES (?, ?, ?, ?)");
  const stmts: D1PreparedStatement[] = [];
  for (const day of [...byDay.keys()].sort()) {
    for (const r of byDay.get(day)!) {
      let s = cum.get(r.id);
      if (!s) {
        s = { id: r.id, prompts: 0, edits: 0, lines: 0, total: 0, bigDay: 0, activeDays: 0,
          countedDays: 0, longestRun: 0, weekendDays: 0, weekendEvents: 0, night: 0,
          lastCounted: "", run: 0 };
        cum.set(r.id, s);
      }
      const n = r.prompts + r.edits;
      s.prompts += r.prompts; s.edits += r.edits; s.lines += r.lines; s.night += r.night;
      s.total += n; s.activeDays++; if (n > s.bigDay) s.bigDay = n;
      if (isWknd(day)) { s.weekendDays++; s.weekendEvents += n; }
      if (n >= 10) { // counted day — same floor as the live badge math
        s.run = s.lastCounted && addDays(s.lastCounted, 1) === day ? s.run + 1 : 1;
        s.lastCounted = day; s.countedDays++;
        if (s.run > s.longestRun) s.longestRun = s.run;
      }
    }
    if (day < start || day > yesterday) continue;
    // "day one": that day's top scorer (tie: earliest account, board rule)
    const top = byDay.get(day)!.slice().sort((a, b) =>
      (b.prompts + b.edits) - (a.prompts + a.edits) ||
      (createdAt.get(a.id) || 0) - (createdAt.get(b.id) || 0))[0];
    if (top) stmts.push(ins.bind(day, "dayone", top.id, top.prompts + top.edits));
    for (const h of badgeHolders([...cum.values()], createdAt))
      stmts.push(ins.bind(day, h.key, h.id, Math.round(h.value)));
  }
  for (let i = 0; i < stmts.length; i += 90) await db.batch(stmts.slice(i, i + 90));
}

async function boardPayload(db: D1Database, code: string | null) {
  // The population: everyone, or just the room's members.
  const users = (code
    ? await db.prepare(`
        SELECT u.github_id AS id, u.login, u.avatar, u.created_at FROM users u
        JOIN memberships m ON m.user_id = u.github_id AND m.room_code = ?
        ORDER BY u.created_at ASC`).bind(code).all()
    : await db.prepare(
        "SELECT github_id AS id, login, avatar, created_at FROM users ORDER BY created_at ASC").all()
  ).results as unknown as BoardUser[];
  const ids = users.map((u) => u.id);
  const ph = ids.map(() => "?").join(",");
  const memberFilter = code ? `AND e.user_id IN (${ph})` : "";
  const bindMembers = code ? ids : [];

  const standings = async (dayFilter?: string) => {
    if (code && !ids.length) return [];
    const where = dayFilter ? "AND e.day = ?" : "";
    const sql = `
      SELECT u.github_id AS id, u.login AS login, u.avatar AS avatar,
             COALESCE(SUM(CASE WHEN e.kind='prompt' THEN 1 ELSE 0 END), 0) AS prompts,
             COALESCE(SUM(CASE WHEN e.kind='edit'   THEN 1 ELSE 0 END), 0) AS edits,
             COALESCE(SUM(CASE WHEN e.kind='edit'   THEN e.value ELSE 0 END), 0) AS lines
      FROM users u
      LEFT JOIN events e ON e.user_id = u.github_id AND e.capped = 0 ${where}
      ${code ? `WHERE u.github_id IN (${ph})` : ""}
      GROUP BY u.github_id
      ${code ? "" : "HAVING (prompts + edits) > 0"}
      ORDER BY (prompts + edits) DESC, lines DESC, u.created_at ASC
      ${code ? "" : "LIMIT 100"}`;
    const binds = [...(dayFilter ? [dayFilter] : []), ...(code ? ids : [])];
    const rows = await db.prepare(sql).bind(...binds).all();
    return (rows.results as any[]).map((r, i) => ({
      rank: i + 1,
      id: r.id,
      login: r.login,
      avatar: r.avatar,
      name: r.login, // kept for older clients
      prompts: r.prompts,
      edits: r.edits,
      lines: r.lines,
      score: r.prompts + r.edits,
    }));
  };

  const now = Date.now();
  const since = utcDay(now - 364 * 86400000);
  const hasPop = ids.length || !code;

  // Write yesterday's day-records (if missing) BEFORE the read wave below so
  // the records query sees them. Memoized per isolate — normally a no-op.
  await finalizeDayRecords(db);

  // All data queries are independent of each other — run them in ONE
  // parallel wave instead of serially. This is the difference between ~1s and
  // ~200ms page data on D1.
  const [daily, series, whoRows, allTimeRaw, todayRaw, nightRows, recRows, srcRows, estRows, costRows] = await Promise.all([
    hasPop
      ? db.prepare(`
          SELECT day, user_id AS id, COUNT(*) AS score FROM events e
          WHERE e.capped = 0 ${memberFilter} GROUP BY day, user_id`).bind(...bindMembers).all()
          .then((r) => r.results as unknown as { day: string; id: number; score: number }[])
      : Promise.resolve([] as { day: string; id: number; score: number }[]),
    hasPop
      ? db.prepare(`
          SELECT day,
                 SUM(CASE WHEN kind='prompt' THEN 1 ELSE 0 END) AS prompts,
                 SUM(CASE WHEN kind='edit'   THEN 1 ELSE 0 END) AS edits
          FROM events e WHERE day >= ? AND e.capped = 0 ${memberFilter}
          GROUP BY day ORDER BY day ASC`).bind(since, ...bindMembers).all()
          .then((r) => r.results)
      : Promise.resolve([]),
    hasPop
      ? db.prepare(`
          SELECT e.day AS day, u.login AS login, u.avatar AS avatar, COUNT(*) AS n
          FROM events e JOIN users u ON u.github_id = e.user_id
          WHERE e.day >= ? AND e.capped = 0 ${memberFilter}
          GROUP BY e.day, e.user_id
          ORDER BY e.day ASC, n DESC, u.created_at ASC`).bind(since, ...bindMembers).all()
          .then((r) => r.results as unknown as { day: string; login: string; avatar: string | null; n: number }[])
      : Promise.resolve([] as { day: string; login: string; avatar: string | null; n: number }[]),
    standings(),
    standings(utcDay(now)),
    hasPop
      ? db.prepare(`
          SELECT e.user_id AS id, COUNT(*) AS n FROM events e
          WHERE CAST(strftime('%H', e.ts/1000, 'unixepoch') AS INTEGER) < 5
            AND e.capped = 0 ${memberFilter}
          GROUP BY e.user_id`).bind(...bindMembers).all()
          .then((r) => r.results as unknown as { id: number; n: number }[])
      : Promise.resolve([] as { id: number; n: number }[]),
    // record history: how many day-ends each user held each badge (+ dayone).
    // Global truth, never room-filtered — badges on room boards still link to
    // the same global record.
    db.prepare(`SELECT user_id AS id, kind, COUNT(*) AS n, MAX(day) AS last
                FROM day_records GROUP BY user_id, kind`).all()
      .then((r) => r.results as unknown as { id: number; kind: string; n: number; last: string }[]),
    // Which agents each user has EVER coded with (presence, not score — so no
    // capped filter). Only non-'claude' rows matter for the UI mark, but we
    // return all so the enrich step can list every agent per user.
    hasPop
      ? db.prepare(`
          SELECT user_id AS id, source FROM events e
          WHERE 1=1 ${memberFilter} GROUP BY user_id, source`).bind(...bindMembers).all()
          .then((r) => r.results as unknown as { id: number; source: string }[])
      : Promise.resolve([] as { id: number; source: string }[]),
    // USAGE_EST basis: events with no real cost coverage (pre-cutoff, or
    // Codex — no statusline). Post-cutoff Claude events are covered by real
    // usage_sessions reports instead, so the two never double-count.
    hasPop
      ? db.prepare(`
          SELECT user_id AS id,
                 SUM(CASE WHEN kind='prompt' THEN 1 ELSE 0 END) AS prompts,
                 SUM(CASE WHEN kind='edit'   THEN 1 ELSE 0 END) AS edits
          FROM events e WHERE e.capped = 0 AND (e.day < ? OR e.source = 'codex') ${memberFilter}
          GROUP BY user_id`).bind(USAGE_CUTOFF, ...bindMembers).all()
          .then((r) => r.results as unknown as { id: number; prompts: number; edits: number }[])
      : Promise.resolve([] as { id: number; prompts: number; edits: number }[]),
    // Real tracked spend. .catch: table may not exist on an un-migrated DB —
    // degrade to estimates only, never take the board down.
    hasPop
      ? db.prepare(`
          SELECT user_id AS id, SUM(cost_usd) AS usd FROM usage_sessions e
          WHERE 1=1 ${memberFilter} GROUP BY user_id`).bind(...bindMembers).all()
          .then((r) => r.results as unknown as { id: number; usd: number }[])
          .catch(() => [] as { id: number; usd: number }[])
      : Promise.resolve([] as { id: number; usd: number }[]),
  ]);

  // tokens/$ per user = estimate over uncovered events + real tracked spend
  // (real $ converted to tokens at the same blended rate, so one number).
  const estBy = new Map(estRows.map((r) => [r.id, r]));
  const usdBy = new Map(costRows.map((r) => [r.id, r.usd || 0]));
  const usageOf = (id: number) => {
    const e = estBy.get(id);
    const estTok = e ? e.prompts * EST_TOK_PER_PROMPT + e.edits * EST_TOK_PER_EDIT : 0;
    const real = usdBy.get(id) || 0;
    return {
      tok: Math.round(estTok + (real / EST_USD_PER_MTOK) * 1e6),
      usd: Math.round(((estTok / 1e6) * EST_USD_PER_MTOK + real) * 100) / 100,
    };
  };

  // agents[] per user, from the source stream ('claude' | 'codex'), sorted for
  // a stable render. The board shows a Codex mark when this includes 'codex'.
  const agentsBy = new Map<number, string[]>();
  for (const r of srcRows) {
    const list = agentsBy.get(r.id) || [];
    if (!list.includes(r.source)) list.push(r.source);
    agentsBy.set(r.id, list);
  }
  for (const list of agentsBy.values()) list.sort();

  // ---- daily-winner streaks + rank movement vs yesterday -------------------
  // Derived from the same global stream, over this board's population.
  const createdAt = new Map(users.map((u) => [u.id, u.created_at]));
  const byDay = new Map<string, { id: number; score: number }[]>();
  for (const r of daily) {
    if (!byDay.has(r.day)) byDay.set(r.day, []);
    byDay.get(r.day)!.push({ id: r.id, score: r.score });
  }
  const days = [...byDay.keys()].sort().reverse(); // most recent first

  // Winner per day (ties broken by who signed up first, matching board order).
  const winnerByDay = new Map<string, number>();
  for (const d of days) {
    const arr = byDay.get(d)!.slice().sort(
      (a, b) => b.score - a.score || (createdAt.get(a.id) || 0) - (createdAt.get(b.id) || 0)
    );
    if (arr.length) winnerByDay.set(d, arr[0].id);
  }
  // Current streak = consecutive most-recent days this user was the winner.
  const streak = new Map<number, number>();
  for (const u of users) {
    let s = 0;
    for (const d of days) { if (winnerByDay.get(d) === u.id) s++; else break; }
    streak.set(u.id, s);
  }

  // Rank movement: today's all-time rank vs rank as of end of yesterday.
  const yesterday = utcDay(now - 86400000);
  const startOfToday = Date.parse(utcDay(now) + "T00:00:00Z");
  const cumYesterday = new Map<number, number>();
  for (const r of daily) {
    if (r.day <= yesterday) cumYesterday.set(r.id, (cumYesterday.get(r.id) || 0) + r.score);
  }
  const yRank = new Map<number, number>();
  users
    .filter((u) => u.created_at < startOfToday) // only users who existed yesterday
    .sort((a, b) => (cumYesterday.get(b.id) || 0) - (cumYesterday.get(a.id) || 0) || a.created_at - b.created_at)
    .forEach((u, i) => yRank.set(u.id, i + 1));

  // ---- badges --------------------------------------------------------------
  // One holder per badge, recomputed on every load. Every badge has a hard
  // qualification floor (volume + shape) so it can only be earned through
  // sustained real use — see the badge study. Ties break by earliest account,
  // matching the leaderboard rule.
  const nightByUser = new Map(nightRows.map((r) => [r.id, r.n]));
  const perDay = new Map<number, { day: string; n: number }[]>();
  for (const r of daily) {
    if (!perDay.has(r.id)) perDay.set(r.id, []);
    perDay.get(r.id)!.push({ day: r.day, n: r.score });
  }
  const isWeekend = (d: string) => {
    const w = new Date(d + "T00:00:00Z").getUTCDay();
    return w === 0 || w === 6;
  };
  const bstats = (allTimeRaw as any[]).map((r) => {
    const udays = perDay.get(r.id) || [];
    // days that count toward consistency badges need >= 10 events (blocks
    // "one token prompt at 11:59pm" streak-keeping)
    const counted = udays.filter((d) => d.n >= 10).map((d) => d.day).sort();
    let run = counted.length ? 1 : 0, longest = run;
    for (let i = 1; i < counted.length; i++) {
      run = Date.parse(counted[i] + "T00:00:00Z") - Date.parse(counted[i - 1] + "T00:00:00Z") === 86400000 ? run + 1 : 1;
      if (run > longest) longest = run;
    }
    const wk = udays.filter((d) => isWeekend(d.day));
    return {
      id: r.id as number,
      prompts: r.prompts as number, edits: r.edits as number, lines: r.lines as number,
      total: (r.prompts + r.edits) as number,
      bigDay: udays.reduce((m, d) => Math.max(m, d.n), 0),
      activeDays: udays.length, countedDays: counted.length, longestRun: longest,
      weekendDays: wk.length, weekendEvents: wk.reduce((s, d) => s + d.n, 0),
      night: nightByUser.get(r.id) || 0,
    };
  });
  const awards = new Map<number, { key: string; label: string }[]>();
  for (const h of badgeHolders(bstats, createdAt)) {
    if (!awards.has(h.id)) awards.set(h.id, []);
    awards.get(h.id)!.push({ key: h.key, label: h.label });
  }

  // record history per user: [{key, n, last}] — n = day-ends held, incl. 'dayone'
  const recsBy = new Map<number, { key: string; n: number; last: string }[]>();
  for (const r of recRows) {
    if (!recsBy.has(r.id)) recsBy.set(r.id, []);
    recsBy.get(r.id)!.push({ key: r.kind, n: r.n, last: r.last });
  }

  const enrich = (rows: any[]) =>
    rows.map((r) => {
      const prev = yRank.get(r.id);
      return {
        ...r,
        ...usageOf(r.id),
        streak: streak.get(r.id) || 0,
        awards: awards.get(r.id) || [],
        records: recsBy.get(r.id) || [],
        agents: agentsBy.get(r.id) || [],
        // +N = climbed N spots since yesterday, -N = dropped, null = new/no history
        delta: prev == null ? null : prev - r.rank,
      };
    });

  // Per-day contributors for the heatmap tooltip: who produced that day's
  // points, biggest contributor first (top 5 + overflow count).
  const whoByDay = new Map<string, { login: string; avatar: string | null; n: number }[]>();
  for (const w of whoRows) {
    if (!whoByDay.has(w.day)) whoByDay.set(w.day, []);
    whoByDay.get(w.day)!.push({ login: w.login, avatar: w.avatar, n: w.n });
  }
  for (const r of series as any[]) {
    const all = whoByDay.get(r.day as string) || [];
    r.who = all.slice(0, 5);
    r.whoMore = Math.max(0, all.length - 5);
  }

  return {
    series,
    allTime: enrich(allTimeRaw),
    today: enrich(todayRaw),
  };
}

// ---- the weekly 25 ---------------------------------------------------------
// Chart weeks run Mon 00:00 → Sun 23:59:59 UTC; the chart "drops" Monday.
// The latest COMPLETED week is finalized lazily on first read (no cron):
// INSERT OR IGNORE on the (week, user_id) PK makes concurrent finalizes safe.

function addDays(day: string, n: number): string {
  return new Date(Date.parse(day + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
}
function weekMonday(ts: number): string {
  const dow = (new Date(ts).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return utcDay(ts - dow * 86400000);
}

// Per-isolate memo so the "is last week finalized yet?" probe runs once per
// isolate per week, not on every request.
let chartMemo = "";
async function ensureChartWeek(db: D1Database, week: string): Promise<void> {
  if (chartMemo === week) return;
  const done = await db.prepare("SELECT 1 AS x FROM chart_weeks WHERE week = ? LIMIT 1")
    .bind(week).first();
  if (!done) {
    const sunday = addDays(week, 6);
    const rows = (await db.prepare(`
      SELECT e.user_id AS id,
             SUM(CASE WHEN e.kind='prompt' THEN 1 ELSE 0 END) AS prompts,
             SUM(CASE WHEN e.kind='edit'   THEN 1 ELSE 0 END) AS edits,
             COUNT(*) AS score
      FROM events e JOIN users u ON u.github_id = e.user_id
      WHERE e.day >= ? AND e.day <= ? AND e.capped = 0
      GROUP BY e.user_id
      ORDER BY score DESC, u.created_at ASC
      LIMIT 25`).bind(week, sunday).all())
      .results as unknown as { id: number; prompts: number; edits: number; score: number }[];
    if (rows.length) {
      const stmt = db.prepare(
        "INSERT OR IGNORE INTO chart_weeks (week, user_id, position, score, prompts, edits) VALUES (?, ?, ?, ?, ?, ?)");
      await db.batch(rows.map((r, i) => stmt.bind(week, r.id, i + 1, r.score, r.prompts, r.edits)));
    }
    // A week with zero activity finalizes to zero rows; memoizing anyway keeps
    // the probe from re-running per request (a fresh isolate re-checks — fine).
  }
  chartMemo = week;
}

export type ChartEntry = {
  position: number; id: number; login: string; avatar: string | null;
  prompts: number; edits: number; score: number;
  // +N climbed, -N fell, 0 held, null = wasn't on last week's chart
  movement: number | null;
  tag: "NEW" | "RE" | null;
  peak: number; weeks: number;
};

async function chartPayload(db: D1Database) {
  const now = Date.now();
  const dow = (new Date(now).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  const week = addDays(weekMonday(now), -7);       // latest completed week
  await ensureChartWeek(db, week);

  const [entryRows, histRows] = await Promise.all([
    db.prepare(`
      SELECT cw.position, cw.score, cw.prompts, cw.edits,
             cw.user_id AS id, u.login, u.avatar
      FROM chart_weeks cw JOIN users u ON u.github_id = cw.user_id
      WHERE cw.week = ? ORDER BY cw.position ASC`).bind(week).all()
      .then((r) => r.results as any[]),
    // Whole history is tiny (≤25 rows/week) — pull it and derive in JS.
    db.prepare("SELECT week, user_id AS id, position FROM chart_weeks WHERE week < ?")
      .bind(week).all()
      .then((r) => r.results as unknown as { week: string; id: number; position: number }[]),
  ]);

  const prevWeek = addDays(week, -7);
  const prevPos = new Map<number, number>();
  const history = new Map<number, number[]>(); // user -> positions of past weeks
  for (const h of histRows) {
    if (h.week === prevWeek) prevPos.set(h.id, h.position);
    if (!history.has(h.id)) history.set(h.id, []);
    history.get(h.id)!.push(h.position);
  }

  const entries: ChartEntry[] = entryRows.map((r) => {
    const past = history.get(r.id) || [];
    const prev = prevPos.get(r.id);
    return {
      position: r.position, id: r.id, login: r.login, avatar: r.avatar,
      prompts: r.prompts, edits: r.edits, score: r.score,
      movement: prev == null ? null : prev - r.position,
      tag: past.length === 0 ? "NEW" : prev == null ? "RE" : null,
      peak: Math.min(r.position, ...past),
      weeks: past.length + 1,
    };
  });

  return {
    week,
    // Mon+Tue the fresh chart is the story; Sunday is last-chance; else cooking.
    state: dow <= 1 ? "dropped" : dow === 6 ? "locks_tonight" : "cooking",
    daysLeft: 7 - dow, // days until the next drop (Monday)
    debuts: entries.filter((e) => e.tag === "NEW").length,
    reentries: entries.filter((e) => e.tag === "RE").length,
    entries,
  };
}

// Standings for a room = its MEMBERS ranked by their global score.
app.get("/api/rooms/:code", async (c) => {
  // Looser than join/check: the room page legitimately polls this every 5s
  // (12/min/tab) — 90/min allows several tabs while still killing brute force.
  if (rateLimited(c, "roomview", 90)) return tooMany(c);
  const code = c.req.param("code").toUpperCase();
  const room = await c.env.DB.prepare("SELECT code, name, owner FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string; owner: string | null }>();
  if (!room) return json(c, { error: "room not found" }, 404);
  const board = await boardPayload(c.env.DB, code);
  return json(c, { room, ...board });
});

// Global standings: every user, ranked by their one event stream. Room chips
// come from memberships (names only — codes are join credentials and must
// never leave the server for rooms the viewer doesn't already have).
// /api/global is fully public and identical for every viewer, but it fans out
// into several D1 queries. Memoize the serialized body per isolate for a few
// seconds so a burst of viewers doesn't re-run the whole fan-out each time.
// Safe ONLY because there's zero per-user data in this response.
let globalCache: { at: number; body: unknown } = { at: 0, body: null };
app.get("/api/global", async (c) => {
  if (globalCache.body && Date.now() - globalCache.at < 5000) {
    return json(c, globalCache.body);
  }
  const memberships = (await c.env.DB.prepare(`
    SELECT m.user_id AS id, COALESCE(r.name, 'unknown room') AS roomName
    FROM memberships m LEFT JOIN rooms r ON r.code = m.room_code
    ORDER BY m.joined_at ASC`).all()).results as unknown as { id: number; roomName: string }[];
  const roomsByUser = new Map<number, string[]>();
  for (const m of memberships) {
    if (!roomsByUser.has(m.id)) roomsByUser.set(m.id, []);
    const arr = roomsByUser.get(m.id)!;
    if (!arr.includes(m.roomName)) arr.push(m.roomName);
  }

  const [board, chart] = await Promise.all([
    boardPayload(c.env.DB, null),
    // The chart must never take the board down with it (e.g. chart_weeks
    // missing on an old DB) — degrade to no banner instead.
    chartPayload(c.env.DB).catch(() => null),
  ]);
  const withRooms = (rows: any[]) =>
    rows.map((r) => ({ ...r, rooms: roomsByUser.get(r.id) || [] }));

  const stats = await c.env.DB.prepare(`
    SELECT (SELECT COUNT(*) FROM rooms) AS rooms,
           (SELECT COUNT(*) FROM users) AS players,
           COALESCE(SUM(CASE WHEN kind='prompt' THEN 1 ELSE 0 END), 0) AS prompts,
           COALESCE(SUM(CASE WHEN kind='edit'   THEN 1 ELSE 0 END), 0) AS edits
    FROM events WHERE capped = 0`).first();

  // Room directory for the sidebar: names only, never codes (join credential).
  const roomsList = (await c.env.DB.prepare(
    "SELECT name FROM rooms ORDER BY created_at ASC").all()).results;

  const payload = {
    stats, roomsList, series: board.series, chart,
    allTime: withRooms(board.allTime), today: withRooms(board.today),
  };
  globalCache = { at: Date.now(), body: payload };
  return json(c, payload);
});

// The calling user's own GLOBAL rank — used by the terminal statusline.
app.get("/api/me", async (c) => {
  const token = c.req.query("token") ?? "";
  const user = await userByToken(c.env.DB, token);
  if (!user) return json(c, { error: "invalid token" }, 401);

  const rows = await c.env.DB.prepare(`
    SELECT u.github_id AS id,
           COALESCE(SUM(CASE WHEN e.kind IN ('prompt','edit') THEN 1 ELSE 0 END),0) AS score
    FROM users u
    LEFT JOIN events e ON e.user_id = u.github_id AND e.capped = 0
    GROUP BY u.github_id
    ORDER BY score DESC, u.created_at ASC`).all();
  const list = rows.results as any[];
  const idx = list.findIndex((r) => r.id === user.id);

  const rooms = (await c.env.DB.prepare(`
    SELECT r.code AS code, r.name AS name
    FROM memberships m JOIN rooms r ON r.code = m.room_code
    WHERE m.user_id = ? ORDER BY m.joined_at ASC`).bind(user.id).all()).results;

  return json(c, {
    login: user.login,
    name: user.login, // kept for older clients
    rank: idx + 1,
    total: list.length,
    score: idx >= 0 ? list[idx].score : 0,
    rooms,
  });
});

// ---- dashboard -----------------------------------------------------------

app.get("/apple-touch-icon.png", (c) =>
  c.body(appleTouchIconBytes(), 200, {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400",
  }));

// CSP for the HTML pages. 'unsafe-inline' is REQUIRED by the dashboard's
// inline-script / inline-style / inline-onclick architecture — the real XSS
// defense is the CODE_RE validation below (a code that isn't [A-Z2-9]{1,6}
// renders the global board, never reaching the HTML). What CSP buys here:
// script-src 'self' blocks INJECTED external scripts, and frame-ancestors
// 'none' blocks clickjacking. img-src allows GitHub avatars + the data: favicon.
// style/font: Saira Condensed for the duel cards. connect: the save-card PNG
// export fetches the avatar + font bytes to inline them into its SVG.
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' https://github.com https://*.githubusercontent.com data:; " +
  "connect-src 'self' https://*.githubusercontent.com https://github.com " +
    "https://fonts.googleapis.com https://fonts.gstatic.com; " +
  "base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

// Site-level share meta (home + room links): the MOST CRACKED hero card.
const homeOg = (c: any) => {
  const origin = new URL(c.req.url).origin;
  return {
    login: "",
    title: "ccrank · who's the most cracked?",
    desc: "The global leaderboard for Claude Code & Codex. Every prompt and every file edit scores a point — live.",
    image: origin + "/og/home.png",
    url: origin,
  };
};
app.get("/", (c) => {
  c.header("Content-Security-Policy", CSP);
  track(c, "page_view", { props: { page: "home" } });
  return c.html(dashboardHtml(null, homeOg(c)));
});
app.get("/r/:code", (c) => {
  c.header("Content-Security-Policy", CSP);
  const code = c.req.param("code").toUpperCase();
  // Only a validated code is echoed into the page; anything else -> global board.
  const valid = CODE_RE.test(code);
  track(c, "page_view", { props: valid ? { page: "room", code } : { page: "home" } });
  return c.html(dashboardHtml(valid ? code : null, homeOg(c)));
});

// The duel page: /duel/<a>-vs-<b> puts two players head to head. Both logins
// are LOGIN_RE-validated before they reach the HTML (same defense as /u/:login),
// and the page itself is the normal dashboard in duel mode — it reads the board
// payload it already fetches, so no extra API surface and no new D1 queries.
app.get("/duel/:pair", async (c) => {
  c.header("Content-Security-Policy", CSP);
  const raw = c.req.param("pair") || "";
  const m = /^([A-Za-z0-9-]{1,39})-vs-([A-Za-z0-9-]{1,39})$/.exec(raw);
  if (!m || !LOGIN_RE.test(m[1]) || !LOGIN_RE.test(m[2]) ||
      m[1].toLowerCase() === m[2].toLowerCase()) {
    track(c, "page_view", { props: { page: "home" } });
    return c.html(dashboardHtml(null, homeOg(c)));
  }
  // Resolve to the CANONICAL logins so the page can't echo arbitrary casing.
  const rows = await c.env.DB.prepare(
    "SELECT login FROM users WHERE lower(login) IN (?, ?)"
  ).bind(m[1].toLowerCase(), m[2].toLowerCase()).all();
  const found = (rows.results as { login: string }[]).map((r) => r.login);
  const a = found.find((l) => l.toLowerCase() === m[1].toLowerCase()) || m[1];
  const b = found.find((l) => l.toLowerCase() === m[2].toLowerCase()) || m[2];
  const origin = new URL(c.req.url).origin;
  track(c, "page_view", { props: { page: "duel", a, b } });
  return c.html(dashboardHtml(null, {
    login: a,
    title: `${a} vs ${b} · ccrank duel`,
    desc: `Head to head on the global Claude Code leaderboard: prompts, edits, lines shipped, dollars burned. Who's more cracked?`,
    image: origin + "/og/home.png",
    url: origin + "/duel/" + a + "-vs-" + b,
  }, "duel", { a, b }));
});

// ---- share cards -----------------------------------------------------------
// GitHub logins: alnum + hyphens, max 39 — anything else never touches D1/HTML.
const LOGIN_RE = /^[a-zA-Z0-9-]{1,39}$/;

// PNG rendering lives on Vercel (og-service/): satori+resvg needs ~300ms+ of
// CPU, and Workers free tier caps at 10ms. The Worker computes the data from
// D1 (cheap) and proxies the pixels (pure I/O), so public URLs stay ours.
const OG_RENDERER = "https://og-service-nu.vercel.app/api/card";

interface OgData {
  row: { rank: number; login: string; avatar: string | null;
         prompts: number; edits: number; score: number;
         awards: { key: string; label: string }[] };
  total: number; maxScore: number;
  heat: { day: string; n: number }[];
}

// The card's data: the user's global board row + their last-13-weeks dailies.
async function ogData(db: D1Database, login: string): Promise<OgData | null> {
  const board = await boardPayload(db, null);
  const rows = (board.allTime || []) as any[];
  const row = rows.find((r) => r.login.toLowerCase() === login.toLowerCase());
  if (!row) return null;
  const since = utcDay(Date.now() - 90 * 86400000);
  const heat = await db.prepare(
    "SELECT day, COUNT(*) AS n FROM events WHERE user_id = ? AND day >= ? AND capped = 0 GROUP BY day")
    .bind(row.id, since).all();
  // "day one" is a record, not a held badge — but it's the flagship receipt,
  // so it leads the card's pill row (renderer draws pills generically).
  const d1 = ((row.records || []) as { key: string; n: number }[]).find((x) => x.key === "dayone");
  const pills = [
    ...(d1 ? [{ key: "dayone", label: d1.n >= 2 ? `day one ×${d1.n}` : "day one" }] : []),
    ...(row.awards || []),
  ];
  return {
    row: { rank: row.rank, login: row.login, avatar: row.avatar,
           prompts: row.prompts, edits: row.edits, score: row.score,
           awards: pills },
    total: rows.length,
    maxScore: rows[0]?.score || 1,
    heat: heat.results as unknown as { day: string; n: number }[],
  };
}

// One card = one KV entry, keyed by the fields that change its pixels. KV is
// GLOBAL (unlike the per-colo edge cache): the share-menu preview pre-warms a
// card, then a crawler hitting any datacenter gets bytes in ~50ms instead of
// a multi-second cold render — X's image fetcher gives up on slow origins.
function ogKey(d: OgData): string {
  return "og:" + d.row.login.toLowerCase() + ":" + d.row.score + ":" + d.row.rank + ":" + d.total +
    ":" + d.row.awards.map((a) => a.label).join("+");
}
async function ogRender(d: OgData): Promise<ArrayBuffer | null> {
  // base64url the payload for the renderer (chunked — no giant spread)
  const bytes = new TextEncoder().encode(JSON.stringify(d));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const d64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const res = await fetch(OG_RENDERER + "?d=" + d64);
  if (!res.ok) return null;
  return await res.arrayBuffer();
}
async function ogPngCached(env: Bindings, d: OgData, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<ArrayBuffer | null> {
  const key = ogKey(d);
  const hit = await env.OG_KV.get(key, "arrayBuffer");
  if (hit) return hit;
  const png = await ogRender(d);
  if (png) ctx.waitUntil(env.OG_KV.put(key, png, { expirationTtl: 86400 }));
  return png;
}

// ---- home OG — the site's own unfurl ---------------------------------------
// The hero card behind sharing the SITE itself (home + room links): MOST
// CRACKED. headline, live top 3 with avatars, live totals, 30-day heat strip.
// Rendered by og-service/api/home.js on Vercel; KV-keyed on day + top scores
// so it stays fresh as the board moves but crawlers get cached bytes fast.
// Registered before /og/:login so the param route can't swallow "home.png".
const OG_HOME_RENDERER = "https://og-service-nu.vercel.app/api/home";
async function homeOgRender(payload: unknown): Promise<ArrayBuffer | null> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const d64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const res = await fetch(OG_HOME_RENDERER + "?d=" + d64);
  return res.ok ? await res.arrayBuffer() : null;
}
app.get("/og/home.png", async (c) => {
  const db = c.env.DB;
  const since = utcDay(Date.now() - 30 * 86400000);
  const [topRows, stats, heat] = await Promise.all([
    db.prepare(`
      SELECT u.login AS login, u.avatar AS avatar, COUNT(*) AS score
      FROM events e JOIN users u ON u.github_id = e.user_id
      WHERE e.capped = 0 GROUP BY e.user_id
      ORDER BY score DESC, u.created_at ASC LIMIT 3`).all(),
    db.prepare(`
      SELECT (SELECT COUNT(*) FROM users) AS players,
             COALESCE(SUM(CASE WHEN kind='prompt' THEN 1 ELSE 0 END),0) AS prompts,
             COALESCE(SUM(CASE WHEN kind='edit'   THEN 1 ELSE 0 END),0) AS edits
      FROM events WHERE capped = 0`).first(),
    db.prepare("SELECT day, COUNT(*) AS n FROM events WHERE capped = 0 AND day >= ? GROUP BY day")
      .bind(since).all(),
  ]);
  const top = (topRows.results as any[]).map((r, i) => ({
    rank: i + 1, login: r.login, avatar: r.avatar, score: r.score }));
  if (!top.length) return c.notFound();
  track(c, "og_card", { props: { login: "@home" } });
  const key = "og:home:" + utcDay(Date.now()) + ":" + top.map((t) => t.score).join("-");
  const hit = await c.env.OG_KV.get(key, "arrayBuffer");
  const png = hit || (await homeOgRender({
    stats, top, heat: heat.results, site: new URL(c.req.url).host,
  }));
  if (!hit && png) c.executionCtx.waitUntil(c.env.OG_KV.put(key, png, { expirationTtl: 86400 }));
  return chartPng(c, png);
});

// The PNG itself: KV-first, render on miss.
// The Monday poster: most-cracked spotlight + rows 2-10 with movement. MUST be
// registered before /og/:login — otherwise the param route swallows "chart.png"
// as a login, finds no such user, and 404s the poster.
app.get("/og/chart.png", async (c) => {
  const chart = await chartPayload(c.env.DB).catch(() => null);
  if (!chart || !chart.entries.length) return c.notFound();
  // Optional viewer identity: ?me=<login> brands that person's row with a
  // "YOU" tag in the poster. Resolve against the rendered top 10 (and to the
  // canonical login, so the param can't inject arbitrary text), then branch
  // the cache key — the plain, unbranded poster stays the shared X-unfurl card.
  const meParam = (c.req.query("me") || "").toLowerCase();
  const meLogin = meParam
    ? chart.entries.slice(0, 10).find((e) => e.login.toLowerCase() === meParam)?.login
    : undefined;
  track(c, "og_card", { props: { login: "@chart" } });
  const payload = {
    kind: "poster", weekLabel: chartWeekLabel(chart.week),
    charted: chart.entries.length, debuts: chart.debuts,
    entries: chart.entries.slice(0, 10), me: meLogin,
  };
  const key = "og:chart:" + chart.week + (meLogin ? ":me:" + meLogin.toLowerCase() : "");
  return chartPng(c, await chartPngCached(c.env, key, payload, c.executionCtx));
});

app.get("/og/:login", async (c) => {
  const login = c.req.param("login").replace(/\.png$/i, "");
  if (!LOGIN_RE.test(login)) return c.notFound();
  const data = await ogData(c.env.DB, login);
  if (!data) return c.notFound();
  track(c, "og_card", { props: { login } });
  const png = await ogPngCached(c.env, data, c.executionCtx);
  if (!png) return c.text("render unavailable", 503);
  return c.body(png, 200, {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=300",
  });
});

// Per-user activity for the click-to-view profile card: the last-13-weeks
// dailies the modal's heatmap needs. Everything else the card draws (rank,
// score, prompts, edits, awards, avatar) is already in the board payload the
// client holds — this fills the one gap, as raw numbers, so the card renders
// instantly and the heatmap hydrates a beat later instead of waiting on the
// multi-second PNG render the modal used to embed.
app.get("/api/heat/:login", async (c) => {
  const login = c.req.param("login");
  if (!LOGIN_RE.test(login)) return c.notFound();
  const u = await c.env.DB.prepare(
    "SELECT github_id AS id FROM users WHERE login = ? COLLATE NOCASE")
    .bind(login).first<{ id: number }>();
  if (!u) return c.notFound();
  const since = utcDay(Date.now() - 90 * 86400000);
  const heat = await c.env.DB.prepare(
    "SELECT day, COUNT(*) AS n FROM events WHERE user_id = ? AND day >= ? AND capped = 0 GROUP BY day")
    .bind(u.id, since).all();
  return c.json({ heat: heat.results }, 200, {
    "Cache-Control": "public, max-age=120",
  });
});

// The share page: the dashboard plus per-user og/twitter meta so a pasted
// link unfurls into the card. ?v=score in shared URLs busts X's unfurl cache.
app.get("/u/:login", async (c) => {
  const login = c.req.param("login");
  if (!LOGIN_RE.test(login)) return c.redirect("/");
  const data = await ogData(c.env.DB, login);
  if (!data) return c.redirect("/");
  // Pre-warm the card into KV: crawlers fetch og:image within seconds of
  // reading this page's meta, and they won't wait out a cold render.
  c.executionCtx.waitUntil(ogPngCached(c.env, data, c.executionCtx).then(() => {}));
  const origin = new URL(c.req.url).origin;
  c.header("Content-Security-Policy", CSP);
  track(c, "page_view", { props: { page: "share", login: data.row.login } });
  return c.html(dashboardHtml(null, {
    login: data.row.login,
    title: `${data.row.login} is #${data.row.rank} of ${data.total} on ccrank`,
    desc: `${data.row.score} pts · ${data.row.prompts} prompts · ${data.row.edits} edits on the global Claude Code leaderboard.`,
    image: `${origin}/og/${encodeURIComponent(data.row.login)}.png?v=${data.row.score}`,
    url: `${origin}/u/${encodeURIComponent(data.row.login)}`,
  }));
});

// ---- chart share cards -----------------------------------------------------
// Same architecture as the personal card: D1 data on the Worker, pixels on
// Vercel, KV as the global cache. A finalized chart week is immutable, so the
// KV keys never need score-busting — the week id alone is the version.
const OG_CHART_RENDERER = "https://og-service-nu.vercel.app/api/chart";

function chartWeekLabel(week: string): string {
  const MO = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const a = new Date(week + "T00:00:00Z");
  const b = new Date(a.getTime() + 6 * 86400000);
  const am = MO[a.getUTCMonth()], bm = MO[b.getUTCMonth()];
  return "week of " + am + " " + a.getUTCDate() + " – " +
    (am === bm ? "" : bm + " ") + b.getUTCDate();
}

async function chartOgRender(payload: unknown): Promise<ArrayBuffer | null> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const d64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const res = await fetch(OG_CHART_RENDERER + "?d=" + d64);
  if (!res.ok) return null;
  return await res.arrayBuffer();
}
async function chartPngCached(env: Bindings, key: string, payload: unknown,
  ctx: { waitUntil(p: Promise<unknown>): void }): Promise<ArrayBuffer | null> {
  const hit = await env.OG_KV.get(key, "arrayBuffer");
  if (hit) return hit;
  const png = await chartOgRender(payload);
  if (png) ctx.waitUntil(env.OG_KV.put(key, png, { expirationTtl: 8 * 86400 }));
  return png;
}
const chartPng = (c: any, png: ArrayBuffer | null) =>
  png
    ? c.body(png, 200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" })
    : c.text("render unavailable", 503);

// One user's chart performance ("debuted at #7").
app.get("/og/chart/:login", async (c) => {
  const login = c.req.param("login").replace(/\.png$/i, "");
  if (!LOGIN_RE.test(login)) return c.notFound();
  const chart = await chartPayload(c.env.DB).catch(() => null);
  const entry = chart?.entries.find((e) => e.login.toLowerCase() === login.toLowerCase());
  if (!chart || !entry) return c.notFound();
  track(c, "og_card", { props: { login: entry.login } });
  const payload = {
    kind: "me", weekLabel: chartWeekLabel(chart.week),
    charted: chart.entries.length, entry,
  };
  return chartPng(c, await chartPngCached(
    c.env, "og:chartme:" + chart.week + ":" + entry.login.toLowerCase(), payload, c.executionCtx));
});

// The chart's share page: the dashboard plus poster meta, so pasting /chart
// anywhere unfurls into this week's drop.
app.get("/chart", async (c) => {
  const chart = await chartPayload(c.env.DB).catch(() => null);
  c.header("Content-Security-Policy", CSP);
  track(c, "page_view", { props: { page: "chart" } });
  if (!chart || !chart.entries.length) return c.html(dashboardHtml(null, undefined, "chart"));
  c.executionCtx.waitUntil(
    chartPngCached(c.env, "og:chart:" + chart.week, {
      kind: "poster", weekLabel: chartWeekLabel(chart.week),
      charted: chart.entries.length, debuts: chart.debuts,
      entries: chart.entries.slice(0, 10),
    }, c.executionCtx).then(() => {}));
  const origin = new URL(c.req.url).origin;
  const e1 = chart.entries[0];
  return c.html(dashboardHtml(null, {
    login: e1.login,
    title: `the weekly 25 · ${chartWeekLabel(chart.week)}`,
    desc: `${e1.login} is this week's most cracked with ${e1.score} pts. ` +
      `${chart.entries.length} charted on the global Claude Code leaderboard.`,
    image: `${origin}/og/chart.png?v=${chart.week}`,
    url: `${origin}/chart`,
  }, "chart"));
});

// ---- README badge ----------------------------------------------------------
// Pure-SVG shields-style badge, rendered on the Worker (no og-service): tiny
// string work fits the free tier's 10ms CPU budget with room to spare.
// Never 404s for a syntactically valid login — a broken image in someone's
// README is worse than an "unranked" badge.

// Approximate 11px Verdana advance widths; digits/letters ~7px, thin glyphs
// less. Good enough because textLength pins the final layout to our estimate.
function badgeTextWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    if ("iljI.·|! ".includes(ch)) w += 3.5;
    else if ("mwMW".includes(ch)) w += 10;
    else if ("▲▼—".includes(ch)) w += 9;
    else w += 6.7;
  }
  return Math.round(w);
}

function badgeSvg(label: string, value: string, valueBg: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lw = badgeTextWidth(label) + 12;
  const vw = badgeTextWidth(value) + 12;
  const w = lw + vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
<title>${esc(label)}: ${esc(value)}</title>
<clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${lw}" height="20" fill="#23201A"/>
<rect x="${lw}" width="${vw}" height="20" fill="${valueBg}"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${lw / 2}" y="14.5" fill="#010101" fill-opacity=".3" textLength="${lw - 12}">${esc(label)}</text>
<text x="${lw / 2}" y="13.5" fill="#FFF7EF" textLength="${lw - 12}">${esc(label)}</text>
<text x="${lw + vw / 2}" y="14.5" fill="#010101" fill-opacity=".3" textLength="${vw - 12}">${esc(value)}</text>
<text x="${lw + vw / 2}" y="13.5" textLength="${vw - 12}">${esc(value)}</text>
</g>
</svg>`;
}

const BADGE_CORAL = "#D97757";
const BADGE_GRAY = "#8B867B";

function badgeResponse(svg: string): Response {
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // One hour is the freshness/beauty tradeoff: GitHub's camo proxy caches
      // aggressively anyway, and rank moves slowly enough that stale-by-an-hour
      // never reads as wrong.
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

app.get("/badge/:login", async (c) => {
  const login = c.req.param("login").replace(/\.svg$/i, "");
  const wantChart = c.req.query("chart") !== undefined;
  const label = wantChart ? "ccrank weekly" : "ccrank";
  if (!LOGIN_RE.test(login)) {
    return badgeResponse(badgeSvg(label, "unranked", BADGE_GRAY));
  }

  // Per-colo edge cache so README traffic doesn't fan out into D1.
  const cache = caches.default;
  const cacheKey = new Request(new URL(c.req.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let res: Response;
  if (wantChart) {
    // Last finalized week's chart position + movement vs the week before.
    // Wrapped so a missing chart_weeks table (pre-chart deploys) degrades to
    // "didn't chart" instead of a 500.
    try {
      const rows = (await c.env.DB.prepare(`
        SELECT cw.week, cw.position FROM chart_weeks cw
        JOIN users u ON u.github_id = cw.user_id
        WHERE lower(u.login) = lower(?)
        ORDER BY cw.week DESC LIMIT 2`).bind(login).all())
        .results as unknown as { week: string; position: number }[];
      if (!rows.length) {
        res = badgeResponse(badgeSvg(label, "didn't chart", BADGE_GRAY));
      } else {
        const latest = (await c.env.DB.prepare(
          "SELECT MAX(week) AS w FROM chart_weeks").first<{ w: string | null }>())?.w;
        if (rows[0].week !== latest) {
          res = badgeResponse(badgeSvg(label, "didn't chart", BADGE_GRAY));
        } else {
          const prevWeek = new Date(Date.parse(rows[0].week + "T00:00:00Z") - 7 * 86400000)
            .toISOString().slice(0, 10);
          const prev = rows[1]?.week === prevWeek ? rows[1].position : null;
          const mv = prev == null ? "new" :
            prev > rows[0].position ? `▲${prev - rows[0].position}` :
            prev < rows[0].position ? `▼${rows[0].position - prev}` : "—";
          res = badgeResponse(badgeSvg(label, `#${rows[0].position} ${mv}`, BADGE_CORAL));
        }
      }
    } catch {
      res = badgeResponse(badgeSvg(label, "didn't chart", BADGE_GRAY));
    }
  } else {
    // All-time global rank, same ordering as the board (score, then lines,
    // then account age). One aggregate pass; the user table is small.
    const rows = (await c.env.DB.prepare(`
      SELECT u.login,
             COALESCE(SUM(CASE WHEN e.kind IN ('prompt','edit') THEN 1 ELSE 0 END), 0) AS score,
             COALESCE(SUM(CASE WHEN e.kind='edit' THEN e.value ELSE 0 END), 0) AS lines
      FROM users u LEFT JOIN events e ON e.user_id = u.github_id AND e.capped = 0
      GROUP BY u.github_id
      HAVING score > 0
      ORDER BY score DESC, lines DESC, u.created_at ASC`).all())
      .results as unknown as { login: string; score: number }[];
    const idx = rows.findIndex((r) => r.login.toLowerCase() === login.toLowerCase());
    res = idx < 0
      ? badgeResponse(badgeSvg(label, "unranked", BADGE_GRAY))
      : badgeResponse(badgeSvg(label,
          `#${idx + 1} · ${rows[idx].score.toLocaleString("en-US")} pts`, BADGE_CORAL));
  }

  c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
});

export default app;
