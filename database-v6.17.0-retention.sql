-- JKZM v6.17.0 - Retention + Cleanup Storage
-- Pridanie stlpcov pre retenciu a cleanup status

ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS retention_days INT DEFAULT 30;
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS storage_deleted_at TIMESTAMPTZ;
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS storage_delete_status TEXT;
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS storage_delete_details JSONB;

CREATE INDEX IF NOT EXISTS idx_official_exports_expires_at ON official_exports(expires_at);
CREATE INDEX IF NOT EXISTS idx_official_exports_storage_deleted_at ON official_exports(storage_deleted_at);

-- Backfill expires_at pre existujuce riadky
UPDATE official_exports 
SET expires_at = created_at + (COALESCE(retention_days, 30) * INTERVAL '1 day')
WHERE expires_at IS NULL;
