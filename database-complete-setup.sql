-- =====================================================
-- JAZDECKÝ KLUB ZELENÁ MÍĽA - KOMPLETNÝ SETUP
-- Spusti CELÝ tento súbor v Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. NASTAVENIA WEBU (SETTINGS)
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS pre settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read settings" ON settings;
DROP POLICY IF EXISTS "Admin write settings" ON settings;
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admin write settings" ON settings FOR ALL USING (true);

-- Úvodné nastavenia
INSERT INTO settings (key, value, category) VALUES
('site_name', 'JK Zelená míľa', 'general'),
('site_description', 'Jazdecký klub so zameraním na systematický tréning jazdcov a športových koní', 'general'),
('contact_email', 'apilera@apilera.com', 'contact'),
('contact_phone', '+421905523022', 'contact'),
('contact_address', 'Sídlo: Nová ulica 297/41, 919 30 Jaslovské Bohunice', 'contact'),
('google_maps_embed', '<iframe src="https://maps.google.com/maps?q=Jazdecký+klub+Zelená+míľa+Jaslovské+Bohunice&output=embed" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>', 'contact'),
('social_facebook', 'https://www.facebook.com/JKZelenaMila', 'social'),
('social_instagram', '', 'social'),
('social_youtube', '', 'social')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 2. ARÉNY (TRÉNINGOVÉ PRIESTORY)
-- =====================================================
CREATE TABLE IF NOT EXISTS arenas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 4,
    is_indoor BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS pre arenas
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read arenas" ON arenas;
DROP POLICY IF EXISTS "Admin write arenas" ON arenas;
CREATE POLICY "Public read arenas" ON arenas FOR SELECT USING (true);
CREATE POLICY "Admin write arenas" ON arenas FOR ALL USING (true);

-- =====================================================
-- 3. ROZVRHY ARÉN
-- =====================================================
CREATE TABLE IF NOT EXISTS arena_schedules (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER REFERENCES arenas(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 60,
    max_riders INTEGER DEFAULT 4,
    allowed_levels TEXT DEFAULT 'all',  -- 'all' alebo comma-separated: 'beginner,intermediate,advanced'
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(arena_id, day_of_week)
);

-- RLS pre arena_schedules
ALTER TABLE arena_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read schedules" ON arena_schedules;
DROP POLICY IF EXISTS "Admin write schedules" ON arena_schedules;
CREATE POLICY "Public read schedules" ON arena_schedules FOR SELECT USING (true);
CREATE POLICY "Admin write schedules" ON arena_schedules FOR ALL USING (true);

-- =====================================================
-- 4. VÝNIMKY V ROZVRHU
-- =====================================================
CREATE TABLE IF NOT EXISTS arena_exceptions (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER REFERENCES arenas(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT TRUE,
    open_time TIME,
    close_time TIME,
    reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS pre arena_exceptions
ALTER TABLE arena_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read exceptions" ON arena_exceptions;
DROP POLICY IF EXISTS "Admin write exceptions" ON arena_exceptions;
CREATE POLICY "Public read exceptions" ON arena_exceptions FOR SELECT USING (true);
CREATE POLICY "Admin write exceptions" ON arena_exceptions FOR ALL USING (true);

-- =====================================================
-- 5. REZERVÁCIE
-- =====================================================
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER REFERENCES arenas(id) ON DELETE CASCADE,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20) NOT NULL,
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    riders_count INTEGER DEFAULT 1,
    horse_id UUID,
    service_type VARCHAR(50) DEFAULT 'lesson',
    skill_level VARCHAR(20),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_arena ON reservations(arena_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- RLS pre reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read reservations" ON reservations;
DROP POLICY IF EXISTS "Public insert reservations" ON reservations;
DROP POLICY IF EXISTS "Admin all reservations" ON reservations;
CREATE POLICY "Public read reservations" ON reservations FOR SELECT USING (true);
CREATE POLICY "Public insert reservations" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin all reservations" ON reservations FOR ALL USING (true);

-- =====================================================
-- 6. DEMO DÁTA - ARÉNY
-- =====================================================
INSERT INTO arenas (name, description, capacity, is_indoor) VALUES
('Vonkajšia aréna', 'Hlavná vonkajšia jazdáreň 60x40m s pieskovým povrchom', 6, false),
('Krytá hala', 'Krytá jazdáreň 40x20m pre celoročný tréning', 4, true),
('Lonžovací kruh', 'Kruhová aréna pre lonžovanie a základný výcvik', 2, false)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. DEMO DÁTA - ROZVRHY
-- =====================================================
-- Vonkajšia aréna (id=1)
INSERT INTO arena_schedules (arena_id, day_of_week, open_time, close_time, slot_duration, max_riders) VALUES
(1, 1, '08:00', '20:00', 60, 6),
(1, 2, '08:00', '20:00', 60, 6),
(1, 3, '08:00', '20:00', 60, 6),
(1, 4, '08:00', '20:00', 60, 6),
(1, 5, '08:00', '20:00', 60, 6),
(1, 6, '09:00', '18:00', 60, 6),
(1, 0, '09:00', '16:00', 60, 4)
ON CONFLICT (arena_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    slot_duration = EXCLUDED.slot_duration,
    max_riders = EXCLUDED.max_riders;

-- Krytá hala (id=2)
INSERT INTO arena_schedules (arena_id, day_of_week, open_time, close_time, slot_duration, max_riders) VALUES
(2, 1, '07:00', '21:00', 60, 4),
(2, 2, '07:00', '21:00', 60, 4),
(2, 3, '07:00', '21:00', 60, 4),
(2, 4, '07:00', '21:00', 60, 4),
(2, 5, '07:00', '21:00', 60, 4),
(2, 6, '08:00', '19:00', 60, 4),
(2, 0, '09:00', '17:00', 60, 3)
ON CONFLICT (arena_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    slot_duration = EXCLUDED.slot_duration,
    max_riders = EXCLUDED.max_riders;

-- Lonžovací kruh (id=3)
INSERT INTO arena_schedules (arena_id, day_of_week, open_time, close_time, slot_duration, max_riders) VALUES
(3, 1, '08:00', '18:00', 30, 2),
(3, 2, '08:00', '18:00', 30, 2),
(3, 3, '08:00', '18:00', 30, 2),
(3, 4, '08:00', '18:00', 30, 2),
(3, 5, '08:00', '18:00', 30, 2),
(3, 6, '09:00', '16:00', 30, 2),
(3, 0, '10:00', '14:00', 30, 1)
ON CONFLICT (arena_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    slot_duration = EXCLUDED.slot_duration,
    max_riders = EXCLUDED.max_riders;

-- =====================================================
-- HOTOVO!
-- =====================================================
SELECT 'Setup dokončený! Tabuľky: settings, arenas, arena_schedules, arena_exceptions, reservations' as status;
