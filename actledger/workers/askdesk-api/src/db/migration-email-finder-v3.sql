-- Email Finder v3: learned patterns + provider tracking

CREATE TABLE IF NOT EXISTS domain_patterns (
  domain TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0,
  sample_email TEXT,
  learned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE domain_cache ADD COLUMN provider TEXT DEFAULT 'free';
