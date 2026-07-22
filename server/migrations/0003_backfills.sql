-- One-shot history backfill receipts: one row per user who has EVER run
-- /api/backfill. Existence of the row is the "once per account" lock; the
-- counts are receipts for what it actually credited.
CREATE TABLE IF NOT EXISTS backfills (
  user_id INTEGER PRIMARY KEY,   -- users.github_id
  at      INTEGER NOT NULL,      -- unix ms of the backfill
  days    INTEGER NOT NULL,      -- distinct days credited
  prompts INTEGER NOT NULL,      -- prompt events inserted (counted, not claimed)
  edits   INTEGER NOT NULL       -- edit events inserted (counted, not claimed)
);
