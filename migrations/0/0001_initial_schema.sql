-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Encryption keys table with RSA key pair for login
CREATE TABLE IF NOT EXISTS encryption_keys (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  encrypted_dek TEXT NOT NULL,
  salt TEXT NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  importance INTEGER NOT NULL CHECK (importance >= 1 AND importance <= 10),
  urgency INTEGER NOT NULL CHECK (urgency >= 1 AND urgency <= 10),
  has_content INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);