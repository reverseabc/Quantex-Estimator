-- Quantex: in-app users and sessions.
-- Run once against the live database:
--   npx wrangler d1 execute quantex-db --remote --file=./migrations/0002_auth.sql

ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
