-- JKZM v6.6 - Záznamová kniha maštale + Návštevná kniha + Dokumenty
-- Spusti v Supabase SQL Editor

-- 1) ZÁZNAMOVÁ KNIHA MAŠTALE (stable_log)
CREATE TABLE IF NOT EXISTS stable_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('arrival', 'departure', 'transfer', 'return', 'quarantine_start', 'quarantine_end', 'death')),
    event_date DATE NOT NULL,
    event_time TIME,
    date_to DATE,
    location_from VARCHAR(200),
    location_to VARCHAR(200),
    reason TEXT,
    responsible_person VARCHAR(200) NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stable_log_horse ON stable_log(horse_id);
CREATE INDEX IF NOT EXISTS idx_stable_log_date ON stable_log(event_date);
CREATE INDEX IF NOT EXISTS idx_stable_log_type ON stable_log(event_type);

-- 2) NÁVŠTEVNÁ KNIHA (visit_log)
CREATE TABLE IF NOT EXISTS visit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_name VARCHAR(200) NOT NULL,
    organization VARCHAR(200),
    purpose VARCHAR(500) NOT NULL,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(200),
    arrival_date DATE NOT NULL,
    arrival_time TIME NOT NULL,
    departure_date DATE,
    departure_time TIME,
    escort_person VARCHAR(200) NOT NULL,
    safety_briefing BOOLEAN DEFAULT FALSE,
    signature_text VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_log_date ON visit_log(arrival_date);
CREATE INDEX IF NOT EXISTS idx_visit_log_name ON visit_log(visitor_name);

-- 3) ROZŠÍRENÁ TABUĽKA DOKUMENTOV (documents_v2)
CREATE TABLE IF NOT EXISTS documents_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'passport', 'vet_report', 'death_certificate', 'rendering', 
        'fei_document', 'sjf_document', 'license', 'consent', 
        'receipt', 'request', 'mail_incoming', 'mail_outgoing', 
        'contract', 'permit', 'inspection', 'other'
    )),
    document_date DATE,
    file_url TEXT,
    file_name VARCHAR(300),
    mime_type VARCHAR(100),
    file_size INTEGER,
    tags TEXT[],
    horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    stable_log_id UUID REFERENCES stable_log(id) ON DELETE SET NULL,
    visit_log_id UUID REFERENCES visit_log(id) ON DELETE SET NULL,
    is_club_document BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_v2_horse ON documents_v2(horse_id);
CREATE INDEX IF NOT EXISTS idx_documents_v2_category ON documents_v2(category);
CREATE INDEX IF NOT EXISTS idx_documents_v2_date ON documents_v2(document_date);
CREATE INDEX IF NOT EXISTS idx_documents_v2_stable_log ON documents_v2(stable_log_id);
CREATE INDEX IF NOT EXISTS idx_documents_v2_visit_log ON documents_v2(visit_log_id);

-- RLS Policies
ALTER TABLE stable_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stable_log_all" ON stable_log FOR ALL USING (true);
CREATE POLICY "visit_log_all" ON visit_log FOR ALL USING (true);
CREATE POLICY "documents_v2_all" ON documents_v2 FOR ALL USING (true);
