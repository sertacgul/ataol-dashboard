CREATE TABLE IF NOT EXISTS email_finder_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  domain TEXT,
  person_name TEXT,
  person_title TEXT,
  found_emails TEXT,
  verified_emails TEXT,
  website_emails TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
CREATE INDEX IF NOT EXISTS idx_email_finder_user ON email_finder_results(user_id);
