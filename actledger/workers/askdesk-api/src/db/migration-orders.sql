-- Purchase history for the super-admin dashboard. One row per billing event.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  event TEXT NOT NULL,
  plan TEXT,
  pack TEXT,
  amount REAL,
  currency TEXT DEFAULT 'USD',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
