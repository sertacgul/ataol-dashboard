-- Email Finder v2: Apollo-style with credits

-- Credits per user
CREATE TABLE IF NOT EXISTS user_credits (
  user_id TEXT PRIMARY KEY,
  monthly_limit INTEGER NOT NULL DEFAULT 25,
  used_this_month INTEGER NOT NULL DEFAULT 0,
  reset_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Revealed emails (cache + history)
CREATE TABLE IF NOT EXISTS email_reveals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  person_name TEXT NOT NULL,
  person_title TEXT,
  email TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unknown',
  confidence_score INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'pattern',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_email_reveals_user ON email_reveals(user_id);
CREATE INDEX IF NOT EXISTS idx_email_reveals_domain ON email_reveals(domain);
CREATE INDEX IF NOT EXISTS idx_email_reveals_email ON email_reveals(email);

-- Domain scrape cache (24h TTL)
CREATE TABLE IF NOT EXISTS domain_cache (
  domain TEXT PRIMARY KEY,
  company_info TEXT,
  people TEXT,
  emails_raw TEXT,
  has_catchall INTEGER NOT NULL DEFAULT 0,
  mx_provider TEXT,
  scraped_at TEXT NOT NULL DEFAULT (datetime('now'))
);
