-- Discount code redemption per user
ALTER TABLE users ADD COLUMN discount_percent INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN discount_expires_at TEXT;
ALTER TABLE users ADD COLUMN discount_code TEXT;
