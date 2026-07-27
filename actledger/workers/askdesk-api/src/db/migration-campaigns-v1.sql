-- Campaign codes module (2026-07-27)

CREATE TABLE IF NOT EXISTS campaign_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,                     -- 'percent' | 'amount' | 'free_month'
  percent INTEGER,
  amount_cents INTEGER,
  duration TEXT NOT NULL DEFAULT 'once',  -- 'once' | 'forever'
  free_months INTEGER,
  redeem_window_days INTEGER,
  eligible_plans TEXT NOT NULL DEFAULT 'all',
  starts_at TEXT,
  ends_at TEXT,
  max_redemptions INTEGER,
  redemptions_count INTEGER NOT NULL DEFAULT 0,
  ls_discount_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaign_redemptions (
  id TEXT PRIMARY KEY,
  code_id TEXT NOT NULL,
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'redeemed',  -- 'redeemed' | 'activated' | 'expired'
  redeem_expires_at TEXT,
  activated_at TEXT,
  plan_granted TEXT,
  free_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_user ON campaign_redemptions(user_id);

ALTER TABLE users ADD COLUMN plan_expires_at TEXT;
ALTER TABLE users ADD COLUMN plan_source TEXT;

-- Seed: LAUNCH100 (1 ay ucretsiz voucher, 90 gun aktivasyon penceresi)
INSERT OR IGNORE INTO campaign_codes (id, code, type, free_months, redeem_window_days, eligible_plans, active)
VALUES ('seed-launch100', 'LAUNCH100', 'free_month', 1, 90, 'all', 1);

-- Seed: LAUNCH50 (mevcut %50 launch indirimi; LS discount id 1058288)
INSERT OR IGNORE INTO campaign_codes (id, code, type, percent, duration, eligible_plans, ls_discount_id, active)
VALUES ('seed-launch50', 'LAUNCH50', 'percent', 50, 'once', 'all', '1058288', 1);
