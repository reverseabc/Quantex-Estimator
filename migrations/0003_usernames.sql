-- Quantex: sign in by username; allow one email to hold several accounts (one per role).
-- Lets a person keep separate Admin and Manager/Estimator accounts with the same email,
-- so no single account combines user administration with estimating/approving (BL-06).
--
-- SQLite can't drop the UNIQUE constraint on users.email in place, so the table is rebuilt.
-- Existing users keep username = their email, so nobody's sign-in changes.
--
-- BACK UP FIRST, then run once against the live database:
--   npx wrangler d1 export quantex-db --remote --output=./backup-before-0003.sql
--   npx wrangler d1 execute quantex-db --remote --file=./migrations/0003_usernames.sql

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,            -- stored lowercase; unique (index below)
  email TEXT,                        -- no longer unique on its own
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Estimator',
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO users_new (id, username, email, name, password_hash, role, is_active, must_change_password, created_by, created_at)
SELECT id, lower(trim(username)), lower(trim(email)), name, password_hash, role, is_active, must_change_password, created_by, created_at
  FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE UNIQUE INDEX idx_users_username ON users(username);
-- One account per role for the same email (e.g. one Admin + one Manager, never two Managers).
CREATE UNIQUE INDEX idx_users_email_role ON users(email, role);
