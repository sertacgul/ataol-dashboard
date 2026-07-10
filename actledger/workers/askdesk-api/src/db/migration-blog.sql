CREATE TABLE IF NOT EXISTS blog_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  platform TEXT DEFAULT 'wordpress',
  blog_url TEXT,
  api_username TEXT,
  api_password TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
