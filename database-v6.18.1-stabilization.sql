-- =====================================================
-- JKZM v6.18.1 - Stabilizácia
-- Zjednotenie trainings tabuliek + vylepšenia
-- =====================================================

-- =====================================================
-- 1) TRAININGS - rozšírenie existujúcej tabuľky
-- =====================================================
-- Pridáme nové polia do existujúcej trainings tabuľky (bez CHECK v ADD COLUMN)
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS discipline TEXT NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS intensity TEXT NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS goals TEXT NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS training_date DATE NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS duration_min INT NULL;

-- Sync training_date s date pre existujúce záznamy
UPDATE trainings SET training_date = date WHERE training_date IS NULL AND date IS NOT NULL;

-- Index pre training_date
CREATE INDEX IF NOT EXISTS idx_trainings_training_date ON trainings(training_date);
CREATE INDEX IF NOT EXISTS idx_trainings_discipline ON trainings(discipline);

-- =====================================================
-- 2) PUBLIC_POSTS - slug deduplication helper
-- =====================================================
-- Funkcia pre generovanie unikátneho slug
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT)
RETURNS TEXT AS $$
DECLARE
    new_slug TEXT;
    counter INT;
BEGIN
    new_slug := base_slug;
    counter := 1;
    
    WHILE EXISTS (SELECT 1 FROM public_posts WHERE slug = new_slug) LOOP
        counter := counter + 1;
        new_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
    
    RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3) AUDIT - index pre lepší výkon
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =====================================================
-- DONE - v6.18.1 Stabilizácia
-- =====================================================
