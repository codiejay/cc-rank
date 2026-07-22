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
  ts      INTEGER NOT NULL,
  -- Anti-farming: events past the daily counted cap (500/user/UTC-day) are
  -- stored but flagged; every score/board/chart query filters capped = 0.
  -- Set at insert time, never retroactively.
  capped  INTEGER NOT NULL DEFAULT 0,
  -- Which coding agent produced the event: 'claude' | 'codex'. Scores merge
  -- across agents (one dev, one number); the board shows a Codex mark on any
  -- user who has ever sent a codex-sourced event.
  source  TEXT NOT NULL DEFAULT 'claude'
);
-- Migration for pre-existing deployments:
--   ALTER TABLE events ADD COLUMN capped INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE events ADD COLUMN source TEXT NOT NULL DEFAULT 'claude';
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_day  ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_user_day ON events(user_id, day);

-- "the weekly 25" — one row per charted user per finalized chart week.
-- week = that week's Monday ('YYYY-MM-DD', UTC); weeks run Mon 00:00 →
-- Sun 23:59:59 UTC and are finalized lazily on first read after they end
-- (INSERT OR IGNORE keyed on the PK makes concurrent finalizes safe).
-- Movement / NEW / RE / peak / weeks-on-chart are all derived from history
-- at read time — never stored, never stale.
CREATE TABLE IF NOT EXISTS chart_weeks (
  week      TEXT NOT NULL,
  user_id   INTEGER NOT NULL,     -- users.github_id
  position  INTEGER NOT NULL,     -- 1..25
  score     INTEGER NOT NULL,     -- prompts + edits inside the week (capped=0)
  prompts   INTEGER NOT NULL,
  edits     INTEGER NOT NULL,
  PRIMARY KEY (week, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chart_user ON chart_weeks(user_id, week);

-- One-shot history backfill receipts: one row per user who has EVER run
-- /api/backfill (the CLI's one-time import of local Claude Code transcripts
-- from the 7 days before signup). Existence of the row is the "once per
-- account" lock; the counts are receipts for what it actually credited.
CREATE TABLE IF NOT EXISTS backfills (
  user_id INTEGER PRIMARY KEY,   -- users.github_id
  at      INTEGER NOT NULL,      -- unix ms of the backfill
  days    INTEGER NOT NULL,      -- distinct days credited
  prompts INTEGER NOT NULL,      -- prompt events inserted (counted, not claimed)
  edits   INTEGER NOT NULL       -- edit events inserted (counted, not claimed)
);

-- Real per-session spend, reported by the statusline: Claude Code hands the
-- statusline `cost.total_cost_usd` (cumulative per session), and the client
-- posts it to /api/usage. One row per (user, session); cost only ratchets up
-- (MAX on conflict) so re-reports and resumed sessions can never double-count.
-- Only exists from the feature's launch day on, and only for Claude Code —
-- older activity and Codex events are covered by a read-time ESTIMATE from
-- event counts (see USAGE_EST in index.ts), so long-time users don't start at 0.
CREATE TABLE IF NOT EXISTS usage_sessions (
  user_id    INTEGER NOT NULL,      -- users.github_id
  session_id TEXT NOT NULL,         -- Claude Code session uuid
  cost_usd   REAL NOT NULL,         -- max cumulative cost seen for the session
  updated_at INTEGER NOT NULL,      -- unix ms of the last report
  PRIMARY KEY (user_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_sessions(user_id);

-- Product-analytics stream (web funnel). CLI activity lives in `events`; this
-- records what happens AROUND it: visits, signups vs returning logins, room
-- creates/joins, share-card unfurls. Append-only, no PII: `actor` is a hash —
-- stable H(github_id) when signed in, daily-rotating H(day+ip+ua) when
-- anonymous. Bots are flagged (is_bot), not dropped. See src/analytics.ts and
-- ANALYTICS.md for the saved queries.
CREATE TABLE IF NOT EXISTS analytics (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        INTEGER NOT NULL,             -- unix ms
  day       TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC)
  event     TEXT NOT NULL,                -- see AnalyticsEvent in analytics.ts
  actor     TEXT NOT NULL,                -- 'u:<hash>' signed-in | 'v:<hash>' anon
  signed_in INTEGER NOT NULL DEFAULT 0,
  is_bot    INTEGER NOT NULL DEFAULT 0,   -- UA looked like a crawler
  country   TEXT,                         -- Cloudflare-provided ISO country
  ref       TEXT,                         -- external referrer host, if any
  props     TEXT                          -- small JSON blob per event type
);
CREATE INDEX IF NOT EXISTS idx_analytics_event_day ON analytics(event, day);
CREATE INDEX IF NOT EXISTS idx_analytics_day      ON analytics(day);
CREATE INDEX IF NOT EXISTS idx_analytics_actor_day ON analytics(actor, day);

-- "record history" — one row per (day, badge) snapshotting who ENDED that UTC
-- day holding the badge, plus kind='dayone' for the day's top scorer.
-- Written lazily on first read after midnight (no cron), INSERT OR IGNORE on
-- the PK, never updated: these are the receipts behind the ×N award counts.
CREATE TABLE IF NOT EXISTS day_records (
  day     TEXT NOT NULL,            -- 'YYYY-MM-DD' (UTC), the finalized day
  kind    TEXT NOT NULL,            -- badge key ('lifter', 'owl', …) | 'dayone'
  user_id INTEGER NOT NULL,         -- users.github_id of the holder/winner
  value   INTEGER NOT NULL DEFAULT 0, -- the qualifying stat, for receipts
  PRIMARY KEY (day, kind)
);
CREATE INDEX IF NOT EXISTS idx_day_records_user ON day_records(user_id);
