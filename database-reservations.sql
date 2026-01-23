-- =====================================================
-- JAZDECKÝ KLUB ZELENÁ MÍĽA - REZERVAČNÝ SYSTÉM
-- Spusti v Supabase SQL Editor
-- =====================================================

-- Tabuľka: Tréningové priestory (arény, haly)
CREATE TABLE IF NOT EXISTS training_spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 1,
    surface_type VARCHAR(50),
    is_indoor BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    color VARCHAR(7) DEFAULT '#228B22',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabuľka: Časové sloty pre priestory
CREATE TABLE IF NOT EXISTS time_slots (
    id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES training_spaces(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER DEFAULT 1,
    slot_type VARCHAR(20) DEFAULT 'training',
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabuľka: Rezervácie
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES training_spaces(id),
    slot_id INTEGER REFERENCES time_slots(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(200),
    customer_phone VARCHAR(50) NOT NULL,
    participants INTEGER DEFAULT 1,
    horse_name VARCHAR(100),
    use_club_horse BOOLEAN DEFAULT TRUE,
    experience_level VARCHAR(20),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    total_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

-- Tabuľka: Blokované termíny
CREATE TABLE IF NOT EXISTS blocked_dates (
    id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES training_spaces(id),
    blocked_date DATE NOT NULL,
    reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_space ON bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_space ON time_slots(space_id);

-- RLS
ALTER TABLE training_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read training_spaces" ON training_spaces;
DROP POLICY IF EXISTS "Public read time_slots" ON time_slots;
DROP POLICY IF EXISTS "Public bookings" ON bookings;
DROP POLICY IF EXISTS "Public blocked_dates" ON blocked_dates;

CREATE POLICY "Public read training_spaces" ON training_spaces FOR SELECT USING (true);
CREATE POLICY "Public read time_slots" ON time_slots FOR SELECT USING (true);
CREATE POLICY "Public bookings" ON bookings FOR ALL USING (true);
CREATE POLICY "Public blocked_dates" ON blocked_dates FOR ALL USING (true);

-- Vzorové dáta
INSERT INTO training_spaces (name, description, capacity, surface_type, is_indoor, color, sort_order) VALUES
('Vonkajšia jazdáreň', 'Hlavná vonkajšia jazdáreň 60x20m', 4, 'piesok', FALSE, '#228B22', 1),
('Krytá hala', 'Krytá jazdiareň 40x20m', 3, 'piesok', TRUE, '#1E90FF', 2),
('Kolbište', 'Menší výbeh pre lonžovanie', 2, 'piesok', FALSE, '#FF8C00', 3)
ON CONFLICT DO NOTHING;

-- Časové sloty - Vonkajšia jazdáreň
INSERT INTO time_slots (space_id, day_of_week, start_time, end_time, max_capacity, slot_type, price) VALUES
(1,1,'08:00','09:00',2,'group',25),(1,1,'09:00','10:00',2,'group',25),(1,1,'10:00','11:00',1,'private',35),
(1,1,'14:00','15:00',2,'group',25),(1,1,'15:00','16:00',3,'kids',20),(1,1,'16:00','17:00',3,'kids',20),(1,1,'17:00','18:00',2,'group',25),
(1,2,'08:00','09:00',2,'group',25),(1,2,'09:00','10:00',2,'group',25),(1,2,'14:00','15:00',2,'group',25),
(1,2,'15:00','16:00',3,'kids',20),(1,2,'16:00','17:00',3,'kids',20),(1,2,'17:00','18:00',2,'group',25),
(1,3,'08:00','09:00',2,'group',25),(1,3,'09:00','10:00',1,'private',35),(1,3,'14:00','15:00',2,'group',25),
(1,3,'15:00','16:00',3,'kids',20),(1,3,'16:00','17:00',3,'kids',20),(1,3,'17:00','18:00',2,'group',25),
(1,4,'08:00','09:00',2,'group',25),(1,4,'09:00','10:00',2,'group',25),(1,4,'14:00','15:00',2,'group',25),
(1,4,'15:00','16:00',3,'kids',20),(1,4,'16:00','17:00',3,'kids',20),(1,4,'17:00','18:00',2,'group',25),
(1,5,'08:00','09:00',2,'group',25),(1,5,'09:00','10:00',2,'group',25),(1,5,'14:00','15:00',2,'group',25),
(1,5,'15:00','16:00',3,'kids',20),(1,5,'16:00','17:00',2,'group',25),
(1,6,'09:00','10:00',2,'group',25),(1,6,'10:00','11:00',2,'group',25),(1,6,'11:00','12:00',3,'kids',20),
(1,6,'14:00','15:00',1,'private',35),(1,6,'15:00','16:00',2,'group',25);

-- Časové sloty - Krytá hala
INSERT INTO time_slots (space_id, day_of_week, start_time, end_time, max_capacity, slot_type, price) VALUES
(2,1,'09:00','10:00',2,'group',30),(2,1,'16:00','17:00',2,'group',30),
(2,2,'09:00','10:00',2,'group',30),(2,2,'16:00','17:00',2,'group',30),
(2,3,'09:00','10:00',2,'group',30),(2,3,'16:00','17:00',2,'group',30),
(2,4,'09:00','10:00',2,'group',30),(2,4,'16:00','17:00',2,'group',30),
(2,5,'09:00','10:00',2,'group',30),(2,5,'16:00','17:00',2,'group',30),
(2,6,'10:00','11:00',2,'group',30),(2,6,'14:00','15:00',2,'group',30);

SELECT 'Rezervačný systém vytvorený!' as status;
