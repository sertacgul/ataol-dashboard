-- Split the single credit pool into outreach + content pools
ALTER TABLE user_credits ADD COLUMN outreach_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN content_used INTEGER NOT NULL DEFAULT 0;
