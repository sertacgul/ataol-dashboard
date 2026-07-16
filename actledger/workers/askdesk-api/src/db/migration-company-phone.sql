-- Business phone for a lead (company). Populated from Google Places (Maps flow)
-- and shown in the lead list + CSV export.
ALTER TABLE companies ADD COLUMN phone TEXT;
