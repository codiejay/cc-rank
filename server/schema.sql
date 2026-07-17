-- ccrank database schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS rooms (
  code       TEXT PRIMARY KEY,      -- short shareable code, e.g. "AB3K9P"
  name       TEXT NOT NULL,
  owner      TEXT,                  -- display name of whoever created the room
  created_at INTEGER NOT NULL       -- unix ms
);

CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,      -- random uuid
  token      TEXT NOT NULL UNIQUE,  -- secret auth token, never exposed in standings
  room_code  TEXT NOT NULL,
  name       TEXT NOT NULL,
  recovery   TEXT,                  -- sha-256 of the player's recovery code
  created_at INTEGER NOT NULL
);

-- One row per tracked action. We store only counts + metadata, never code content.
CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  room_code TEXT NOT NULL,
  kind      TEXT NOT NULL,          -- 'prompt' | 'edit'
  value     INTEGER NOT NULL DEFAULT 1,  -- prompts = 1; edits = lines changed (>=1)
  day       TEXT NOT NULL,          -- 'YYYY-MM-DD' (UTC), for daily boards
  ts        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_code);
CREATE INDEX IF NOT EXISTS idx_events_room  ON events(room_code);
CREATE INDEX IF NOT EXISTS idx_events_day   ON events(room_code, day);
CREATE INDEX IF NOT EXISTS idx_events_pl    ON events(player_id);
