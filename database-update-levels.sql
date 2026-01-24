-- =====================================================
-- AKTUALIZÁCIA DATABÁZY - Pridanie povolených úrovní
-- Spusti tento SQL v Supabase SQL Editor
-- =====================================================

-- Pridaj stĺpec allowed_levels do arena_schedules (ak ešte neexistuje)
ALTER TABLE arena_schedules 
ADD COLUMN IF NOT EXISTS allowed_levels TEXT DEFAULT 'all';

-- Komentár
COMMENT ON COLUMN arena_schedules.allowed_levels IS 'Povolené úrovne jazdcov: all alebo comma-separated hodnoty (beginner,intermediate,advanced)';

-- Hotovo!
SELECT 'Stĺpec allowed_levels pridaný do arena_schedules' as status;
