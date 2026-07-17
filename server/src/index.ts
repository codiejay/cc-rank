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
// Recovery codes prove ownership of a player name when rejoining from a new
// machine. We store only the sha-256 of the code.
function recoveryCode(): string {
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s.slice(0, 4) + "-" + s.slice(4);
}
async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const json = (c: any, data: unknown, status = 200) => c.json(data, status);

// ---- rooms ---------------------------------------------------------------

// Create a room -> returns its code.
app.post("/api/rooms", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 60) || "Untitled room";
  const owner = String(body?.owner ?? "").trim().slice(0, 40) || null;
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
      await c.env.DB.prepare(
        "INSERT INTO rooms (code, name, owner, created_at) VALUES (?, ?, ?, ?)"
      ).bind(code, name, owner, now).run();
      return json(c, { code, name, owner });
    } catch {
      /* collision, try again */
    }
  }
  return json(c, { error: "could not allocate room code" }, 500);
});

// Join a room -> returns a secret token the client stores.
app.post("/api/rooms/:code/join", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 40);
  if (!name) return json(c, { error: "name is required" }, 400);

  const room = await c.env.DB.prepare("SELECT code, name, owner FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string; owner: string | null }>();
  if (!room) return json(c, { error: "room not found" }, 404);

  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");

  // Name already taken in this room? Reclaiming it (new machine / lost config)
  // requires the recovery code issued when the name was first claimed —
  // otherwise anyone with the room code could hijack a friend's player.
  const existing = await c.env.DB.prepare(
    "SELECT id, recovery FROM players WHERE room_code = ? AND lower(name) = lower(?)"
  ).bind(code, name).first<{ id: string; recovery: string | null }>();
  if (existing) {
    const supplied = String(body?.recovery ?? "").trim().toUpperCase();
    const ok = existing.recovery && supplied &&
      (await sha256(supplied)) === existing.recovery;
    if (!ok) return json(c, { error: "name_taken" }, 409);
    await c.env.DB.prepare("UPDATE players SET token = ? WHERE id = ?")
      .bind(token, existing.id).run();
    return json(c, {
      token, playerId: existing.id, name, roomCode: code,
      roomName: room.name, owner: room.owner, reclaimed: true,
    });
  }

  const id = crypto.randomUUID();
  const recovery = recoveryCode();
  await c.env.DB.prepare(
    "INSERT INTO players (id, token, room_code, name, recovery, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, token, code, name, await sha256(recovery), Date.now()).run();

  return json(c, {
    token, playerId: id, name, roomCode: code,
    roomName: room.name, owner: room.owner, reclaimed: false,
    recoveryCode: recovery,
  });
});

// Pre-flight check for CREATE: is this room name still free (globally)?
app.get("/api/check-room", async (c) => {
  const name = String(c.req.query("name") ?? "").trim();
  if (!name) return json(c, { ok: false, reason: "empty" });
  const dup = await c.env.DB.prepare("SELECT code FROM rooms WHERE lower(name) = lower(?)")
    .bind(name).first();
  return json(c, { ok: !dup, reason: dup ? "room_name_taken" : null });
});

// Pre-flight check for JOIN: does the room exist, and is this name still free in it?
app.get("/api/rooms/:code/check", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const name = String(c.req.query("name") ?? "").trim();
  const room = await c.env.DB.prepare("SELECT code, name FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string }>();
  if (!room) return json(c, { ok: false, reason: "room_not_found" });
  if (!name) return json(c, { ok: true, roomName: room.name });
  const taken = await c.env.DB.prepare(
    "SELECT id FROM players WHERE room_code = ? AND lower(name) = lower(?)"
  ).bind(code, name).first();
  return json(c, { ok: !taken, reason: taken ? "name_taken" : null, roomName: room.name });
});

// Issue a (new) recovery code for the calling player. Auth via their token,
// so only someone already signed in as that player can mint one.
app.post("/api/recovery", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  const player = await c.env.DB.prepare("SELECT id FROM players WHERE token = ?")
    .bind(token).first<{ id: string }>();
  if (!player) return json(c, { error: "invalid token" }, 401);
  const code = recoveryCode();
  await c.env.DB.prepare("UPDATE players SET recovery = ? WHERE id = ?")
    .bind(await sha256(code), player.id).run();
  return json(c, { recoveryCode: code });
});

// Record a batch of events. Auth via the player's token.
app.post("/api/events", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  if (!token) return json(c, { error: "token required" }, 401);

  const player = await c.env.DB.prepare(
    "SELECT id, room_code FROM players WHERE token = ?"
  ).bind(token).first<{ id: string; room_code: string }>();
  if (!player) return json(c, { error: "invalid token" }, 401);

  // Accept either a single event or {events:[...]}.
  const raw = Array.isArray(body?.events) ? body.events : [body];
  const now = Date.now();
  const day = utcDay(now);

  const stmt = c.env.DB.prepare(
    "INSERT INTO events (player_id, room_code, kind, value, day, ts) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const batch = [];
  for (const e of raw.slice(0, 50)) {
    const kind = e?.kind === "edit" ? "edit" : e?.kind === "prompt" ? "prompt" : null;
    if (!kind) continue;
    const value = Math.max(1, Math.min(100000, Math.floor(Number(e?.value) || 1)));
    batch.push(stmt.bind(player.id, player.room_code, kind, value, day, now));
  }
  if (batch.length) await c.env.DB.batch(batch);
  return json(c, { ok: true, recorded: batch.length });
});

// Standings for a room (all-time + today).
app.get("/api/rooms/:code", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const room = await c.env.DB.prepare("SELECT code, name, owner FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string; owner: string | null }>();
  if (!room) return json(c, { error: "room not found" }, 404);

  const standings = async (dayFilter?: string) => {
    const where = dayFilter ? "AND e.day = ?" : "";
    const sql = `
      SELECT p.id AS id, p.name AS name,
             COALESCE(SUM(CASE WHEN e.kind='prompt' THEN 1 ELSE 0 END), 0) AS prompts,
             COALESCE(SUM(CASE WHEN e.kind='edit'   THEN 1 ELSE 0 END), 0) AS edits,
             COALESCE(SUM(CASE WHEN e.kind='edit'   THEN e.value ELSE 0 END), 0) AS lines
      FROM players p
      LEFT JOIN events e ON e.player_id = p.id ${where}
      WHERE p.room_code = ?
      GROUP BY p.id
      ORDER BY (prompts + edits) DESC, lines DESC, p.created_at ASC`;
    const binds = dayFilter ? [dayFilter, code] : [code];
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    return (rows.results as any[]).map((r, i) => ({
      rank: i + 1,
      id: r.id,
      name: r.name,
      prompts: r.prompts,
      edits: r.edits,
      lines: r.lines,
      score: r.prompts + r.edits,
    }));
  };

  // ---- daily-winner streaks + rank movement vs yesterday -------------------
  // Everything below is derived from the events already stored; no new schema.
  const players = (await c.env.DB.prepare(
    "SELECT id, created_at FROM players WHERE room_code = ?"
  ).bind(code).all()).results as { id: string; created_at: number }[];
  const daily = (await c.env.DB.prepare(
    "SELECT day, player_id AS id, COUNT(*) AS score FROM events WHERE room_code = ? GROUP BY day, player_id"
  ).bind(code).all()).results as { day: string; id: string; score: number }[];

  const createdAt = new Map(players.map((p) => [p.id, p.created_at]));
  const byDay = new Map<string, { id: string; score: number }[]>();
  for (const r of daily) {
    if (!byDay.has(r.day)) byDay.set(r.day, []);
    byDay.get(r.day)!.push({ id: r.id, score: r.score });
  }
  const days = [...byDay.keys()].sort().reverse(); // most recent first

  // Winner per day (ties broken by who joined first, matching the board order).
  const winnerByDay = new Map<string, string>();
  for (const d of days) {
    const arr = byDay.get(d)!.slice().sort(
      (a, b) => b.score - a.score || (createdAt.get(a.id) || 0) - (createdAt.get(b.id) || 0)
    );
    if (arr.length) winnerByDay.set(d, arr[0].id);
  }
  // Current streak = consecutive most-recent days this player was the winner.
  const streak = new Map<string, number>();
  for (const p of players) {
    let s = 0;
    for (const d of days) { if (winnerByDay.get(d) === p.id) s++; else break; }
    streak.set(p.id, s);
  }

  // Rank movement: today's all-time rank vs rank as of end of yesterday.
  const now = Date.now();
  const yesterday = utcDay(now - 86400000);
  const startOfToday = Date.parse(utcDay(now) + "T00:00:00Z");
  const cumYesterday = new Map<string, number>();
  for (const r of daily) {
    if (r.day <= yesterday) cumYesterday.set(r.id, (cumYesterday.get(r.id) || 0) + r.score);
  }
  const yRank = new Map<string, number>();
  players
    .filter((p) => p.created_at < startOfToday) // only players who existed yesterday
    .sort((a, b) => (cumYesterday.get(b.id) || 0) - (cumYesterday.get(a.id) || 0) || a.created_at - b.created_at)
    .forEach((p, i) => yRank.set(p.id, i + 1));

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

  return json(c, {
    room,
    allTime: enrich(await standings()),
    today: enrich(await standings(utcDay(now))),
  });
});

// A single player's own rank — used by the terminal statusline.
app.get("/api/me", async (c) => {
  const token = c.req.query("token") ?? "";
  const player = await c.env.DB.prepare(
    "SELECT id, room_code, name FROM players WHERE token = ?"
  ).bind(token).first<{ id: string; room_code: string; name: string }>();
  if (!player) return json(c, { error: "invalid token" }, 401);

  const rows = await c.env.DB.prepare(`
    SELECT p.id AS id,
           COALESCE(SUM(CASE WHEN e.kind IN ('prompt','edit') THEN 1 ELSE 0 END),0) AS score
    FROM players p
    LEFT JOIN events e ON e.player_id = p.id
    WHERE p.room_code = ?
    GROUP BY p.id
    ORDER BY score DESC, p.created_at ASC`).bind(player.room_code).all();

  const list = rows.results as any[];
  const idx = list.findIndex((r) => r.id === player.id);
  const me = list[idx];
  return json(c, {
    name: player.name,
    roomCode: player.room_code,
    rank: idx + 1,
    total: list.length,
    score: me ? me.score : 0,
  });
});

// ---- dashboard -----------------------------------------------------------

app.get("/", (c) => c.html(dashboardHtml(null)));
app.get("/r/:code", (c) => c.html(dashboardHtml(c.req.param("code").toUpperCase())));

export default app;
