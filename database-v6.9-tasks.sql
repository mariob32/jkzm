-- JKZM v6.9.0 - Úlohy a Notifikácie
-- Spustiť v Supabase SQL Editor

-- 1) TABUĽKA TASKS (manuálne úlohy)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    due_date DATE,
    entity_type VARCHAR(50),
    entity_id UUID,
    horse_id UUID REFERENCES horses(id),
    assigned_to UUID REFERENCES admin_users(id),
    created_by UUID REFERENCES admin_users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_horse ON tasks(horse_id);

-- 2) TABUĽKA NOTIFICATION_RULES (pravidlá pre automatické upozornenia)
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

-- 3) ROZŠÍRENIE NOTIFICATIONS (ak existuje)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS rule_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 4) RLS POLICIES
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_all ON tasks;
DROP POLICY IF EXISTS notification_rules_all ON notification_rules;

CREATE POLICY tasks_all ON tasks FOR ALL USING (true);
CREATE POLICY notification_rules_all ON notification_rules FOR ALL USING (true);

-- 5) PREDVOLENÉ PRAVIDLÁ
INSERT INTO notification_rules (name, rule_type, entity_type, condition_field, days_before, severity, message_template) VALUES
('Expirácia SJF licencie koňa', 'expiry', 'horses', 'sjf_license_valid_until', 60, 'warning', 'SJF licencia koňa {name} expiruje {date}'),
('Expirácia FEI pasu koňa', 'expiry', 'horses', 'fei_passport_expiry', 60, 'warning', 'FEI pas koňa {name} expiruje {date}'),
('Expirácia očkovania', 'expiry', 'vaccinations', 'next_due_date', 30, 'danger', 'Očkovanie koňa {horse_name} je potrebné do {date}'),
('Chýbajúci pas koňa', 'missing', 'horses', 'passport_number', 0, 'danger', 'Kôň {name} nemá zadané číslo pasu')
ON CONFLICT DO NOTHING;
