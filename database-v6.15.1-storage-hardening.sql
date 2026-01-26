-- JKZM v6.15.1 - Storage Hardening Migration
-- Doplnenie stlpcov pre official_exports

-- Storage bucket (default 'exports')
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'exports';

-- Checksums ako text
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS checksums_sha256 TEXT;

-- Manifest ako JSONB (ak este neexistuje pod inym menom)
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS manifest_json JSONB;

-- Signed URL expiration (informativne)
ALTER TABLE official_exports ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMPTZ;

-- Index pre cleanup queries
CREATE INDEX IF NOT EXISTS idx_official_exports_created_at ON official_exports(created_at);
