-- Record when a user accepted the Terms of Use at registration.
ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
