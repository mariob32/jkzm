-- JKZM v6.14.0 - Official Exports Archive
-- Ukladanie exportov do DB s manifestom a checksums

-- Tabulka official_exports
CREATE TABLE IF NOT EXISTS official_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('svps', 'sjf')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    actor_id UUID,
    actor_name TEXT,
    ip TEXT,
    user_agent TEXT,
    filters JSONB,
    files JSONB,
    manifest JSONB,
    sha256 JSONB,
    zip_bytes BYTEA,
    size_bytes BIGINT
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_official_exports_created_at ON official_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_official_exports_type ON official_exports(type);
CREATE INDEX IF NOT EXISTS idx_official_exports_actor_name ON official_exports(actor_name);

-- RLS
ALTER TABLE official_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS official_exports_all ON official_exports;
CREATE POLICY official_exports_all ON official_exports USING (true);

-- Komentare
COMMENT ON TABLE official_exports IS 'Archiv oficialnych exportov SVPS/SJF s manifestom a checksums';
COMMENT ON COLUMN official_exports.type IS 'Typ exportu: svps alebo sjf';
COMMENT ON COLUMN official_exports.manifest IS 'MANIFEST.json obsah';
COMMENT ON COLUMN official_exports.sha256 IS 'SHA256 checksums pre kazdy subor v ZIP';
COMMENT ON COLUMN official_exports.zip_bytes IS 'Kompletny ZIP subor ako bytea';
COMMENT ON COLUMN official_exports.size_bytes IS 'Velkost ZIP v bajtoch';
