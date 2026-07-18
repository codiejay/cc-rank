-- ccrank database schema (Cloudflare D1 / SQLite)
--
-- USER-PRIMARY model: the user (a claimed GitHub login) is the entity that
-- owns events. Rooms are optional membership groupings — a room's board is
-- its members ranked by their GLOBAL score, never a room-scoped count.

-- A user exists only after GitHub itself verified them: the CLI obtains a
-- GitHub access token (device flow / gh CLI) and the server exchanges it at
-- api.github.com/user for the VERIFIED {id, login, avatar_url} before minting
-- our own session token. Keyed on GitHub's numeric id — stable across renames;
-- login + avatar are display-only and refresh on every sign-in.
CREATE TABLE IF NOT EXISTS users (
  github_id  INTEGER PRIMARY KEY,   -- GitHub's immutable numeric user id
  login      TEXT NOT NULL,         -- current GitHub username (display)
  avatar     TEXT,                  -- avatar_url from GitHub (display)
  token      TEXT NOT NULL UNIQUE,  -- OUR session token (used by the hook), never exposed
  created_at INTEGER NOT NULL       -- unix ms
);

CREATE TABLE IF NOT EXISTS rooms (
  code       TEXT PRIMARY KEY,      -- short shareable code, e.g. "AB3K9P"
  name       TEXT NOT NULL,
  owner      TEXT,                  -- GitHub login of whoever created the room
  created_at INTEGER NOT NULL
);
-- Room names are globally unique, case-insensitive, so a shared code always
-- maps to one obvious room.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_name ON rooms(lower(name));

-- Room membership: purely a grouping. Holds no counts of its own.
-- user_id = users.github_id.
CREATE TABLE IF NOT EXISTS memberships (
  user_id   INTEGER NOT NULL,
  room_code TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, room_code)
);
CREATE INDEX IF NOT EXISTS idx_memberships_room ON memberships(room_code);

-- ONE global stream: every event belongs to a user, never to a room.
-- We store only counts + metadata, never code content.
CREATE TABLE IF NOT EXISTS events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,        -- users.github_id
  kind    TEXT NOT NULL,            -- 'prompt' | 'edit'
  value   INTEGER NOT NULL DEFAULT 1,  -- prompts = 1; edits = lines changed (>=1)
  day     TEXT NOT NULL,            -- 'YYYY-MM-DD' (UTC), for daily boards
  ts      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_day  ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_user_day ON events(user_id, day);
