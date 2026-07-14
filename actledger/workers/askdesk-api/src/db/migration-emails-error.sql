-- Record why a send failed (so status='failed' can carry the reason).
ALTER TABLE emails ADD COLUMN error TEXT;
