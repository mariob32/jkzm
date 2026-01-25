-- =====================================================
-- JKZM v6.11 MIGRACIA - ULOHY A NOTIFIKACIE
-- Spusti tento SQL v Supabase SQL Editor
-- =====================================================

-- TABULKA: TASKS (Ulohy)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'open',
    due_date DATE,
    entity_type VARCHAR(50),
    entity_id UUID,
    horse_id UUID,
    assigned_to UUID,
    created_by UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexy pre tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_horse_id ON tasks(horse_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- TABULKA: NOTIFICATION_RULES (Pravidla notifikacii)
CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    condition_field VARCHAR(100),
    condition_operator VARCHAR(20),
    condition_value VARCHAR(100),
    days_before INTEGER DEFAULT 30,
    severity VARCHAR(20) DEFAULT 'warning',
    message_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pridaj stlpce do notifications ak neexistuju
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS rule_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS assigned_horse_id UUID;

-- Indexy pre notifications
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_dismissed ON notifications(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_rule ON notifications(rule_id);
CREATE INDEX IF NOT EXISTS idx_notifications_horse ON notifications(assigned_horse_id);

-- RLS Policies (ak este neexistuju)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_all') THEN
        CREATE POLICY tasks_all ON tasks FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_rules' AND policyname = 'notification_rules_all') THEN
        CREATE POLICY notification_rules_all ON notification_rules FOR ALL USING (true);
    END IF;
END $$;

-- Predvolene pravidla notifikacii
INSERT INTO notification_rules (name, rule_type, entity_type, condition_field, days_before, severity, message_template, is_active)
SELECT * FROM (VALUES
    ('Expiracia SJF licencie', 'expiry', 'horse', 'sjf_license_valid_until', 60, 'warning', 'SJF licencia pre {entity_name} expiruje {days_until} dni', true),
    ('Expiracia FEI pasu', 'expiry', 'horse', 'fei_passport_expiry', 60, 'warning', 'FEI pas pre {entity_name} expiruje {days_until} dni', true),
    ('Expiracia ockovania', 'expiry', 'vaccination', 'next_date', 30, 'warning', 'Ockovanie {vaccine_type} pre {entity_name} expiruje {days_until} dni', true),
    ('Chybajuci pas kona', 'missing', 'horse', 'passport_number', 0, 'danger', 'Kon {entity_name} nema evidovany pas', true),
    ('Expiracia poistenia', 'expiry', 'horse', 'insurance_valid_until', 30, 'warning', 'Poistenie pre {entity_name} expiruje {days_until} dni', true)
) AS v(name, rule_type, entity_type, condition_field, days_before, severity, message_template, is_active)
WHERE NOT EXISTS (SELECT 1 FROM notification_rules LIMIT 1);

-- Hotovo
SELECT 'MIGRACIA DOKONCENA - tasks a notification_rules vytvorene' as status;
