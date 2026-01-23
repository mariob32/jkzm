-- =====================================================
-- JAZDECKÝ KLUB ZELENÁ MÍĽA - REZERVAČNÝ SYSTÉM
-- Spusti tento SQL v Supabase SQL Editor
-- =====================================================

-- Tréningové priestory (arény/haly)
CREATE TABLE IF NOT EXISTS arenas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 4,           -- Max počet jazdcov naraz
    is_indoor BOOLEAN DEFAULT FALSE,      -- Krytá hala vs vonkajšia aréna
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Otváracie hodiny pre arény (pre každý deň v týždni)
CREATE TABLE IF NOT EXISTS arena_schedules (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER REFERENCES arenas(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Nedeľa, 1=Pondelok...6=Sobota
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 60,     -- Dĺžka slotu v minútach
    max_riders INTEGER DEFAULT 4,         -- Max jazdcov v tomto čase
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(arena_id, day_of_week)
);

-- Výnimky v rozvrhu (sviatky, údržba, špeciálne udalosti)
CREATE TABLE IF NOT EXISTS arena_exceptions (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER REFERENCES arenas(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT TRUE,       -- Zatvorené celý deň
    open_time TIME,                        -- Ak nie je zatvorené, alternatívne hodiny
    close_time TIME,
    reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rezervácie
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER REFERENCES arenas(id) ON DELETE CASCADE,
    
    -- Zákazník
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Rezervácia
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Detaily
    riders_count INTEGER DEFAULT 1,       -- Počet jazdcov
    horse_id UUID,                         -- Vlastný kôň (optional) - UUID typ
    service_type VARCHAR(50) DEFAULT 'lesson', -- lesson, free_ride, longing, etc.
    skill_level VARCHAR(20),              -- beginner, intermediate, advanced
    notes TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexy pre rýchle vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_arena ON reservations(arena_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- RLS Policies
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read arenas" ON arenas FOR SELECT USING (true);
CREATE POLICY "Admin write arenas" ON arenas FOR ALL USING (true);

CREATE POLICY "Public read schedules" ON arena_schedules FOR SELECT USING (true);
CREATE POLICY "Admin write schedules" ON arena_schedules FOR ALL USING (true);

CREATE POLICY "Public read exceptions" ON arena_exceptions FOR SELECT USING (true);
CREATE POLICY "Admin write exceptions" ON arena_exceptions FOR ALL USING (true);

CREATE POLICY "Public read reservations" ON reservations FOR SELECT USING (true);
CREATE POLICY "Public insert reservations" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin all reservations" ON reservations FOR ALL USING (true);

-- Vloženie demo dát
INSERT INTO arenas (name, description, capacity, is_indoor) VALUES
('Vonkajšia aréna', 'Hlavná vonkajšia jazdáreň 60x40m s pieskovým povrchom', 6, false),
('Krytá hala', 'Krytá jazdáreň 40x20m pre celoročný tréning', 4, true),
('Lonžovací kruh', 'Kruhová aréna pre lonžovanie a základný výcvik', 2, false)
ON CONFLICT DO NOTHING;

-- Rozvrh pre vonkajšiu arénu (arena_id = 1)
INSERT INTO arena_schedules (arena_id, day_of_week, open_time, close_time, slot_duration, max_riders) VALUES
(1, 1, '08:00', '20:00', 60, 6),  -- Pondelok
(1, 2, '08:00', '20:00', 60, 6),  -- Utorok
(1, 3, '08:00', '20:00', 60, 6),  -- Streda
(1, 4, '08:00', '20:00', 60, 6),  -- Štvrtok
(1, 5, '08:00', '20:00', 60, 6),  -- Piatok
(1, 6, '09:00', '18:00', 60, 6),  -- Sobota
(1, 0, '09:00', '16:00', 60, 4)   -- Nedeľa
ON CONFLICT DO NOTHING;

-- Rozvrh pre krytú halu (arena_id = 2)
INSERT INTO arena_schedules (arena_id, day_of_week, open_time, close_time, slot_duration, max_riders) VALUES
(2, 1, '07:00', '21:00', 60, 4),
(2, 2, '07:00', '21:00', 60, 4),
(2, 3, '07:00', '21:00', 60, 4),
(2, 4, '07:00', '21:00', 60, 4),
(2, 5, '07:00', '21:00', 60, 4),
(2, 6, '08:00', '19:00', 60, 4),
(2, 0, '09:00', '17:00', 60, 3)
ON CONFLICT DO NOTHING;

-- Rozvrh pre lonžovací kruh (arena_id = 3)
INSERT INTO arena_schedules (arena_id, day_of_week, open_time, close_time, slot_duration, max_riders) VALUES
(3, 1, '08:00', '18:00', 30, 2),
(3, 2, '08:00', '18:00', 30, 2),
(3, 3, '08:00', '18:00', 30, 2),
(3, 4, '08:00', '18:00', 30, 2),
(3, 5, '08:00', '18:00', 30, 2),
(3, 6, '09:00', '16:00', 30, 2),
(3, 0, '10:00', '14:00', 30, 1)
ON CONFLICT DO NOTHING;

SELECT 'Rezervačný systém vytvorený!' as status;
