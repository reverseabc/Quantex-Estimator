CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  project_name TEXT,
  jira_ref TEXT,
  owner TEXT,
  status TEXT,
  grand_total REAL,
  data TEXT NOT NULL,          -- full estimate JSON (sections, items, buffer etc.)
  last_modified TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);