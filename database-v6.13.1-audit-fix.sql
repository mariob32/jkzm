-- JKZM v6.13.1 - Audit Hardening Migration
-- Oprava entity_id nullable + indexy pre export audit

-- Zabezpec ze entity_id je NULLABLE
ALTER TABLE audit_logs ALTER COLUMN entity_id DROP NOT NULL;

-- Index pre rychle filtrovanie exportov a audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_entity_type_created
ON audit_logs(action, entity_type, created_at DESC);

-- Zabezpec ze vsetky potrebne stlpce su nullable (idempotentne)
ALTER TABLE audit_logs ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN actor_name DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN ip DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN user_agent DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN before_data DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN after_data DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN diff DROP NOT NULL;
