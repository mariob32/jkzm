-- JKZM v6.12.0 - AUDIT TRAIL PRO
-- Migracia pre rozsirenu audit funkcionalitu

-- Zabezpec ze audit_logs tabulka existuje s vsetkymi stlpcami
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(20) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    actor_id UUID,
    actor_name VARCHAR(120),
    ip VARCHAR(64),
    user_agent TEXT,
    before_data JSONB,
    after_data JSONB,
    diff JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pridaj chybajuce stlpce ak existuje stara tabulka
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(20);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_name VARCHAR(120);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diff JSONB;

-- Indexy pre vyhladavanie
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_name);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_all ON audit_logs;
CREATE POLICY audit_logs_all ON audit_logs FOR ALL USING (true);

-- Komentar
COMMENT ON TABLE audit_logs IS 'JKZM Audit Trail Pro - kto, kedy, co zmenil + pred/po data';
