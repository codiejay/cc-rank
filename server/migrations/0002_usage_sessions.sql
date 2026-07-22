-- Real per-session spend reported by the statusline (see schema.sql).
CREATE TABLE IF NOT EXISTS usage_sessions (
  user_id    INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  cost_usd   REAL NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_sessions(user_id);
