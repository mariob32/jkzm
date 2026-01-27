-- JKZM v6.16.0 - Export Integrity Verification
-- Pridanie stlpcov pre overenie integrity exportov

ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS verified_status TEXT;
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS verified_details JSONB;
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS verifier_actor_id UUID;
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS verifier_actor_name TEXT;

CREATE INDEX IF NOT EXISTS idx_official_exports_verified_at ON official_exports(verified_at);
