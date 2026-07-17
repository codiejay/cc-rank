import { Hono } from "hono";
import { cors } from "hono/cors";
import { dashboardHtml } from "./dashboard";

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

type User = { id: number; login: string };

async function userByToken(db: D1Database, token: string): Promise<User | null> {
  if (!token) return null;
  return db.prepare("SELECT github_id AS id, login FROM users WHERE token = ?")
    .bind(token).first<User>();
}

// ---- login ---------------------------------------------------------------

// Sign in with GitHub. The client sends a GitHub access token (obtained via
// device flow or the gh CLI); we ask GitHub whose token it is and trust ONLY
// that answer — never a client-supplied identity. Users are keyed on GitHub's
// immutable numeric id (rename-proof); login/avatar are display and refresh
// on every sign-in. The GitHub token is used once and never stored.
app.post("/api/login", async (c) => {
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

  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const existing = await c.env.DB.prepare(
    "SELECT github_id FROM users WHERE github_id = ?"
  ).bind(gh.id).first();

  if (existing) {
    // Same person, new machine/session — re-mint our token, refresh display.
    await c.env.DB.prepare(
      "UPDATE users SET token = ?, login = ?, avatar = ? WHERE github_id = ?"
    ).bind(token, gh.login, gh.avatar_url, gh.id).run();
    return json(c, { token, login: gh.login, avatar: gh.avatar_url, reclaimed: true });
  }
  await c.env.DB.prepare(
    "INSERT INTO users (github_id, login, avatar, token, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(gh.id, gh.login, gh.avatar_url, token, Date.now()).run();
  return json(c, { token, login: gh.login, avatar: gh.avatar_url, reclaimed: false });
});

// ---- rooms ---------------------------------------------------------------

// Create a room -> returns its code. Auth via user token; the creator is
// auto-joined (a room with zero members is useless).
app.post("/api/rooms", async (c) => {
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
    } catch {
      /* collision, try again */
    }
  }
  return json(c, { error: "could not allocate room code" }, 500);
});

// Join a room = add a membership. Identity comes from the token; a room is
// just a grouping, so joining never touches counts.
app.post("/api/rooms/:code/join", async (c) => {
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
  const code = c.req.param("code").toUpperCase();
  const room = await c.env.DB.prepare("SELECT code, name FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string }>();
  if (!room) return json(c, { ok: false, reason: "room_not_found" });
  return json(c, { ok: true, roomName: room.name });
});

// Pre-flight for CREATE: is this room name still free (globally)?
app.get("/api/check-room", async (c) => {
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
  if (batch.length) await c.env.DB.batch(batch);
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

  // ---- daily-winner streaks + rank movement vs yesterday -------------------
  // Derived from the same global stream, over this board's population.
  const daily = (ids.length || !code
    ? (await db.prepare(`
        SELECT day, user_id AS id, COUNT(*) AS score FROM events e
        WHERE 1=1 ${memberFilter} GROUP BY day, user_id`).bind(...bindMembers).all()).results
    : []) as { day: string; id: number; score: number }[];

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
  const now = Date.now();
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

  // Daily activity series for the dashboard's contribution heatmap
  // (up to a GitHub-style year of days).
  const since = utcDay(now - 364 * 86400000);
  const series = (ids.length || !code
    ? (await db.prepare(`
        SELECT day,
               SUM(CASE WHEN kind='prompt' THEN 1 ELSE 0 END) AS prompts,
               SUM(CASE WHEN kind='edit'   THEN 1 ELSE 0 END) AS edits
        FROM events e WHERE day >= ? ${memberFilter}
        GROUP BY day ORDER BY day ASC`).bind(since, ...bindMembers).all()).results
    : []);

  return {
    series,
    allTime: enrich(await standings()),
    today: enrich(await standings(utcDay(now))),
  };
}

// Standings for a room = its MEMBERS ranked by their global score.
app.get("/api/rooms/:code", async (c) => {
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
app.get("/api/global", async (c) => {
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

  return json(c, {
    stats, roomsList, series: board.series,
    allTime: withRooms(board.allTime), today: withRooms(board.today),
  });
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

app.get("/", (c) => c.html(dashboardHtml(null)));
app.get("/r/:code", (c) => c.html(dashboardHtml(c.req.param("code").toUpperCase())));

export default app;
