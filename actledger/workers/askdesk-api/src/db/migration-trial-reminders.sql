-- Track which trial-ending reminders were sent, so they fire once each.
ALTER TABLE users ADD COLUMN reminder_24h_sent_at TEXT;
ALTER TABLE users ADD COLUMN reminder_1h_sent_at TEXT;
