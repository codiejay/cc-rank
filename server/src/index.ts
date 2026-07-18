import { Hono } from "hono";
import { cors } from "hono/cors";
import { dashboardHtml } from "./dashboard";
import { appleTouchIconBytes } from "./appleTouchIcon";

type Bindings = { DB: D1Database };

const app = new Hono<{ Bindings: Bindings }>();
app.use("/api/*", cors());

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
    return json(c, { token, githubId: gh.id, login: gh.login, avatar: gh.avatar_url, reclaimed: true });
  }
  await c.env.DB.prepare(
    "INSERT INTO users (github_id, login, avatar, token, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(gh.id, gh.login, gh.avatar_url, tokenHash, Date.now()).run();
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

  const stmt = c.env.DB.prepare(
    "INSERT INTO events (user_id, kind, value, day, ts) VALUES (?, ?, ?, ?, ?)"
  );
  const batch = [];
  for (const e of raw.slice(0, 50)) {
    const kind = e?.kind === "edit" ? "edit" : e?.kind === "prompt" ? "prompt" : null;
    if (!kind) continue;
    const value = Math.max(1, Math.min(100000, Math.floor(Number(e?.value) || 1)));
    batch.push(stmt.bind(user.id, kind, value, day, now));
  }
  // Per-user per-UTC-day cap: record at most 2000 events/day. Bounds abuse and
  // runaway clients while sitting far above any honest day's activity.
  if (batch.length) {
    const { n } = (await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND day = ?"
    ).bind(user.id, day).first<{ n: number }>()) ?? { n: 0 };
    const remaining = Math.max(0, 2000 - n);
    const toInsert = batch.slice(0, remaining);
    if (toInsert.length) await c.env.DB.batch(toInsert);
  }
  return json(c, { ok: true, recorded: batch.length });
});

// ---- boards --------------------------------------------------------------
// One implementation serves both boards. A board is always "users ranked by
// their GLOBAL activity"; a room merely filters WHICH users appear.

type BoardUser = { id: number; login: string; avatar: string | null; created_at: number };

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
      LEFT JOIN events e ON e.user_id = u.github_id ${where}
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

  // All five data queries are independent of each other — run them in ONE
  // parallel wave instead of serially. This is the difference between ~1s and
  // ~200ms page data on D1.
  const [daily, series, whoRows, allTimeRaw, todayRaw] = await Promise.all([
    hasPop
      ? db.prepare(`
          SELECT day, user_id AS id, COUNT(*) AS score FROM events e
          WHERE 1=1 ${memberFilter} GROUP BY day, user_id`).bind(...bindMembers).all()
          .then((r) => r.results as unknown as { day: string; id: number; score: number }[])
      : Promise.resolve([] as { day: string; id: number; score: number }[]),
    hasPop
      ? db.prepare(`
          SELECT day,
                 SUM(CASE WHEN kind='prompt' THEN 1 ELSE 0 END) AS prompts,
                 SUM(CASE WHEN kind='edit'   THEN 1 ELSE 0 END) AS edits
          FROM events e WHERE day >= ? ${memberFilter}
          GROUP BY day ORDER BY day ASC`).bind(since, ...bindMembers).all()
          .then((r) => r.results)
      : Promise.resolve([]),
    hasPop
      ? db.prepare(`
          SELECT e.day AS day, u.login AS login, u.avatar AS avatar, COUNT(*) AS n
          FROM events e JOIN users u ON u.github_id = e.user_id
          WHERE e.day >= ? ${memberFilter}
          GROUP BY e.day, e.user_id
          ORDER BY e.day ASC, n DESC, u.created_at ASC`).bind(since, ...bindMembers).all()
          .then((r) => r.results as unknown as { day: string; login: string; avatar: string | null; n: number }[])
      : Promise.resolve([] as { day: string; login: string; avatar: string | null; n: number }[]),
    standings(),
    standings(utcDay(now)),
  ]);

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

  const enrich = (rows: any[]) =>
    rows.map((r) => {
      const prev = yRank.get(r.id);
      return {
        ...r,
        streak: streak.get(r.id) || 0,
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

  const board = await boardPayload(c.env.DB, null);
  const withRooms = (rows: any[]) =>
    rows.map((r) => ({ ...r, rooms: roomsByUser.get(r.id) || [] }));

  const stats = await c.env.DB.prepare(`
    SELECT (SELECT COUNT(*) FROM rooms) AS rooms,
           (SELECT COUNT(*) FROM users) AS players,
           COALESCE(SUM(CASE WHEN kind='prompt' THEN 1 ELSE 0 END), 0) AS prompts,
           COALESCE(SUM(CASE WHEN kind='edit'   THEN 1 ELSE 0 END), 0) AS edits
    FROM events`).first();

  // Room directory for the sidebar: names only, never codes (join credential).
  const roomsList = (await c.env.DB.prepare(
    "SELECT name FROM rooms ORDER BY created_at ASC").all()).results;

  const payload = {
    stats, roomsList, series: board.series,
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
    LEFT JOIN events e ON e.user_id = u.github_id
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
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' https://github.com https://*.githubusercontent.com data:; " +
  "connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

app.get("/", (c) => {
  c.header("Content-Security-Policy", CSP);
  return c.html(dashboardHtml(null));
});
app.get("/r/:code", (c) => {
  c.header("Content-Security-Policy", CSP);
  const code = c.req.param("code").toUpperCase();
  // Only a validated code is echoed into the page; anything else -> global board.
  return c.html(dashboardHtml(CODE_RE.test(code) ? code : null));
});

export default app;
