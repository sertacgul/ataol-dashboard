-- Purchased (pay-as-you-go) credit balances that add on top of the monthly plan
-- allowance and do NOT reset each month.
ALTER TABLE user_credits ADD COLUMN outreach_purchased INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN content_purchased INTEGER NOT NULL DEFAULT 0;
