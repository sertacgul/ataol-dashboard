-- Concierge "done-for-you lead list" requests captured from the public landing form.
CREATE TABLE IF NOT EXISTS lead_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  sector TEXT,
  region TEXT,
  titles TEXT,
  quantity TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now'))
);
