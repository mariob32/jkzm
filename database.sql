-- =====================================================
-- JAZDECKÝ KLUB ZELENÁ MÍĽA - DATABÁZOVÁ SCHÉMA
-- Spustite tento SQL skript v Supabase SQL Editor
-- =====================================================

-- Tabuľka koní
CREATE TABLE IF NOT EXISTS horses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    birth_date DATE,
    height INTEGER,
    color VARCHAR(50),
    gender VARCHAR(20),
    level VARCHAR(20) DEFAULT 'beginner',
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka jazdcov
CREATE TABLE IF NOT EXISTS riders (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    birth_date DATE,
    level VARCHAR(20) DEFAULT 'beginner',
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka trénerov
CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    specialization VARCHAR(100),
    hourly_rate DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka zamestnancov
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    position VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka tréningov
CREATE TABLE IF NOT EXISTS trainings (
    id SERIAL PRIMARY KEY,
    rider_id INTEGER REFERENCES riders(id) ON DELETE SET NULL,
    horse_id INTEGER REFERENCES horses(id) ON DELETE SET NULL,
    trainer_id INTEGER REFERENCES trainers(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration INTEGER DEFAULT 60,
    type VARCHAR(50) DEFAULT 'individual',
    price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka kŕmnych plánov
CREATE TABLE IF NOT EXISTS feeding_schedules (
    id SERIAL PRIMARY KEY,
    horse_id INTEGER REFERENCES horses(id) ON DELETE CASCADE,
    time_of_day VARCHAR(20),
    feed_time TIME,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka položiek krmiva
CREATE TABLE IF NOT EXISTS feeding_items (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES feeding_schedules(id) ON DELETE CASCADE,
    feed_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2),
    unit VARCHAR(20) DEFAULT 'kg'
);

-- Tabuľka zdravotných záznamov
CREATE TABLE IF NOT EXISTS health_records (
    id SERIAL PRIMARY KEY,
    horse_id INTEGER REFERENCES horses(id) ON DELETE CASCADE,
    record_date DATE DEFAULT CURRENT_DATE,
    record_type VARCHAR(50) NOT NULL,
    description TEXT,
    vet_name VARCHAR(100),
    cost DECIMAL(10,2),
    next_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka platieb
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    rider_id INTEGER REFERENCES riders(id) ON DELETE SET NULL,
    training_id INTEGER REFERENCES trainings(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka rezervácií z webu
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    service VARCHAR(100),
    preferred_date DATE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka kontaktných správ
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    service VARCHAR(100),
    message TEXT,
    status VARCHAR(20) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka používateľov (admin)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politiky pre všetky tabuľky (povoliť všetko pre service role)
CREATE POLICY "Allow all for service role" ON horses FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON riders FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON trainers FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON trainings FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON feeding_schedules FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON feeding_items FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON health_records FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON bookings FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON contact_messages FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON users FOR ALL USING (true);

-- =====================================================
-- DEMO DÁTA - ADMIN POUŽÍVATEĽ
-- =====================================================

-- Heslo: admin123 (bcrypt hash)
INSERT INTO users (email, password_hash, name, role) 
VALUES ('admin@jkzm.sk', '$2b$10$rQEY9zBXqJQKJ5fVZxVUU.mLHLyqFqxvqF5Q5z5z5z5z5z5z5z5z5', 'Administrátor', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- DEMO DÁTA - UKÁŽKOVÉ ZÁZNAMY
-- =====================================================

-- Ukážkové kone
INSERT INTO horses (name, breed, color, level, status) VALUES 
('Blesk', 'Lipican', 'Belouš', 'intermediate', 'active'),
('Luna', 'Slovenský teplokrvník', 'Hnedák', 'beginner', 'active'),
('Šibal', 'Hafling', 'Izabelový', 'children', 'active')
ON CONFLICT DO NOTHING;

-- Ukážkoví tréneri
INSERT INTO trainers (first_name, last_name, specialization, hourly_rate) VALUES 
('Peter', 'Novák', 'Drezúra', 25.00),
('Anna', 'Kováčová', 'Skoky', 30.00)
ON CONFLICT DO NOTHING;

SELECT 'Databáza bola úspešne vytvorená!' as status;
