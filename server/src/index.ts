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

// ---- rooms ---------------------------------------------------------------

// Create a room -> returns its code.
app.post("/api/rooms", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 60) || "Untitled room";
  const now = Date.now();

  // Retry a couple of times in the (astronomically unlikely) event of a collision.
  for (let i = 0; i < 5; i++) {
    const code = roomCode();
    try {
      await c.env.DB.prepare(
        "INSERT INTO rooms (code, name, created_at) VALUES (?, ?, ?)"
      ).bind(code, name, now).run();
      return json(c, { code, name });
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

  const room = await c.env.DB.prepare("SELECT code, name FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string }>();
  if (!room) return json(c, { error: "room not found" }, 404);

  const id = crypto.randomUUID();
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare(
    "INSERT INTO players (id, token, room_code, name, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, token, code, name, Date.now()).run();

  return json(c, { token, playerId: id, name, roomCode: code, roomName: room.name });
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
  const room = await c.env.DB.prepare("SELECT code, name FROM rooms WHERE code = ?")
    .bind(code).first<{ code: string; name: string }>();
  if (!room) return json(c, { error: "room not found" }, 404);

  const standings = async (dayFilter?: string) => {
    const where = dayFilter ? "AND e.day = ?" : "";
    const sql = `
      SELECT p.name AS name,
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
      name: r.name,
      prompts: r.prompts,
      edits: r.edits,
      lines: r.lines,
      score: r.prompts + r.edits,
    }));
  };

  return json(c, {
    room,
    allTime: await standings(),
    today: await standings(utcDay(Date.now())),
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
