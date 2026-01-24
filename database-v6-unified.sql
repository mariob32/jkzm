-- =====================================================
-- JAZDECKÝ KLUB ZELENÁ MÍĽA - KOMPLETNÝ DATABÁZOVÝ SETUP
-- Verzia: 6.0
-- Spusti CELÝ tento súbor v Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ZÁKLADNÉ ENTITY
-- =====================================================

-- KONE
CREATE TABLE IF NOT EXISTS horses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    stable_name VARCHAR(50),
    breed VARCHAR(100),
    color VARCHAR(50),
    sex VARCHAR(20) CHECK (sex IN ('stallion', 'mare', 'gelding')),
    birth_date DATE,
    passport_number VARCHAR(50) UNIQUE,
    life_number VARCHAR(50) UNIQUE,
    microchip VARCHAR(15) UNIQUE,
    owner_name VARCHAR(200),
    owner_contact VARCHAR(200),
    photo_url TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'retired', 'sold', 'deceased')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- JAZDCI
CREATE TABLE IF NOT EXISTS riders (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    emergency_contact VARCHAR(200),
    emergency_phone VARCHAR(50),
    skill_level VARCHAR(20) DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    sjf_license_number VARCHAR(20),
    sjf_license_type VARCHAR(20),
    sjf_license_valid_until DATE,
    photo_url TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRÉNERI
CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(50),
    specialization VARCHAR(100),
    qualification VARCHAR(100),
    sjf_trainer_license VARCHAR(20),
    sjf_license_valid_until DATE,
    hourly_rate DECIMAL(10,2),
    photo_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ZAMESTNANCI
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(200),
    phone VARCHAR(50),
    hire_date DATE,
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. ZÁZNAMY A PREPOJENIA
-- =====================================================

-- VETERINÁRNE ZÁZNAMY
CREATE TABLE IF NOT EXISTS vet_records (
    id SERIAL PRIMARY KEY,
    horse_id INTEGER REFERENCES horses(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    veterinarian VARCHAR(100),
    diagnosis TEXT,
    treatment TEXT,
    medication TEXT,
    cost DECIMAL(10,2),
    next_checkup DATE,
    document_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KŔMENIE
CREATE TABLE IF NOT EXISTS feeding (
    id SERIAL PRIMARY KEY,
    horse_id INTEGER REFERENCES horses(id) ON DELETE CASCADE,
    feeding_date DATE NOT NULL,
    feeding_time VARCHAR(20),
    fed_by INTEGER REFERENCES employees(id),
    hay_kg DECIMAL(5,2),
    grain_kg DECIMAL(5,2),
    supplements TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRÉNINGY
CREATE TABLE IF NOT EXISTS trainings (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    trainer_id INTEGER REFERENCES trainers(id),
    rider_id INTEGER REFERENCES riders(id),
    horse_id INTEGER REFERENCES horses(id),
    training_type VARCHAR(50),
    duration_minutes INTEGER DEFAULT 60,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PRETEKY
CREATE TABLE IF NOT EXISTS competitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    competition_date DATE,
    end_date DATE,
    organizer VARCHAR(200),
    competition_type VARCHAR(50),
    level VARCHAR(50),
    entry_fee DECIMAL(10,2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VÝSLEDKY PRETEKOV
CREATE TABLE IF NOT EXISTS competition_results (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
    rider_id INTEGER REFERENCES riders(id),
    horse_id INTEGER REFERENCES horses(id),
    discipline VARCHAR(100),
    placement INTEGER,
    score DECIMAL(10,2),
    time_seconds DECIMAL(10,2),
    penalties INTEGER,
    prize_money DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PLATBY
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    rider_id INTEGER REFERENCES riders(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(50),
    payment_method VARCHAR(50),
    description TEXT,
    invoice_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ČLENSTVÁ
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    rider_id INTEGER REFERENCES riders(id),
    membership_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    fee DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFIKÁCIE
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) DEFAULT 'info',
    title VARCHAR(200) NOT NULL,
    message TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_trainer_id INTEGER REFERENCES trainers(id),
    assigned_horse_id INTEGER REFERENCES horses(id),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. REZERVAČNÝ SYSTÉM
-- =====================================================

-- ARÉNY (TRÉNINGOVÉ PRIESTORY)
CREATE TABLE IF NOT EXISTS arenas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 4,
    is_indoor BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ROZVRHY ARÉN
CREATE TABLE IF NOT EXISTS arena_schedules (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER REFERENCES arenas(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 60,
    max_riders INTEGER DEFAULT 4,
    allowed_levels TEXT DEFAULT 'all',
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(arena_id, day_of_week)
);

-- VÝNIMKY V ROZVRHU
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

-- REZERVÁCIE (OPRAVENÉ - horse_id je INTEGER)
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
    horse_id INTEGER REFERENCES horses(id) ON DELETE SET NULL,
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

-- =====================================================
-- 4. CMS SYSTÉM
-- =====================================================

-- ALBUMY
CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FOTKY
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KATEGÓRIE ČLÁNKOV
CREATE TABLE IF NOT EXISTS article_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ČLÁNKY
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(300),
    content TEXT,
    excerpt TEXT,
    cover_image TEXT,
    author VARCHAR(100),
    category_id INTEGER REFERENCES article_categories(id),
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STRÁNKY
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE,
    content TEXT,
    meta_title VARCHAR(200),
    meta_description TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOKUMENTY
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PARTNERI
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    partner_type VARCHAR(50) DEFAULT 'partner',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLUŽBY
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    price_note VARCHAR(100),
    duration VARCHAR(50),
    icon VARCHAR(10),
    badge VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. NASTAVENIA
-- =====================================================

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. KONTAKTNÉ SPRÁVY
-- =====================================================

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(50),
    subject VARCHAR(200),
    message TEXT,
    status VARCHAR(20) DEFAULT 'new',
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. ADMIN POUŽÍVATELIA
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    role VARCHAR(50) DEFAULT 'admin',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. SJF REGISTER (READ-ONLY)
-- =====================================================

CREATE TABLE IF NOT EXISTS sjf_clubs (
    id SERIAL PRIMARY KEY,
    sjf_id VARCHAR(50),
    name VARCHAR(200),
    address TEXT,
    region VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sjf_persons (
    id SERIAL PRIMARY KEY,
    sjf_id VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    club_name VARCHAR(200),
    role VARCHAR(100),
    license_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. INDEXY
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_arena ON reservations(arena_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_trainings_date ON trainings(date);
CREATE INDEX IF NOT EXISTS idx_vet_records_horse ON vet_records(horse_id);
CREATE INDEX IF NOT EXISTS idx_feeding_horse ON feeding(horse_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- =====================================================
-- 10. RLS POLICIES
-- =====================================================

ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE vet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Povoliť public read + admin write pre všetky tabuľky
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'horses', 'riders', 'trainers', 'employees', 'vet_records', 'feeding',
        'trainings', 'competitions', 'competition_results', 'payments', 'memberships',
        'notifications', 'arenas', 'arena_schedules', 'arena_exceptions', 'reservations',
        'albums', 'photos', 'article_categories', 'articles', 'pages', 'documents',
        'partners', 'services', 'settings', 'contacts'
    ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public read %I" ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Admin write %I" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public read %I" ON %I FOR SELECT USING (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY "Admin write %I" ON %I FOR ALL USING (true)', tbl, tbl);
    END LOOP;
END $$;

-- =====================================================
-- 11. ZÁKLADNÉ DÁTA
-- =====================================================

-- Nastavenia
INSERT INTO settings (key, value, category) VALUES
('site_name', 'JK Zelená míľa', 'general'),
('site_description', 'Jazdecký klub so zameraním na systematický tréning jazdcov a športových koní', 'general'),
('contact_email', 'apilera@apilera.com', 'contact'),
('contact_phone', '+421905523022', 'contact'),
('contact_address', 'Sídlo: Nová ulica 297/41, 919 30 Jaslovské Bohunice', 'contact'),
('social_facebook', 'https://www.facebook.com/JKZelenaMila', 'social')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

-- Demo arény
INSERT INTO arenas (name, description, capacity, is_indoor) VALUES
('Vonkajšia aréna', 'Hlavná vonkajšia jazdáreň 60x40m s pieskovým povrchom', 6, false),
('Krytá hala', 'Krytá jazdáreň 40x20m pre celoročný tréning', 4, true),
('Lonžovací kruh', 'Kruhová aréna pre lonžovanie a základný výcvik', 2, false)
ON CONFLICT DO NOTHING;

-- Demo rozvrhy pre arény
INSERT INTO arena_schedules (arena_id, day_of_week, open_time, close_time, slot_duration, max_riders, allowed_levels) VALUES
(1, 1, '08:00', '20:00', 60, 6, 'all'),
(1, 2, '08:00', '20:00', 60, 6, 'all'),
(1, 3, '08:00', '20:00', 60, 6, 'all'),
(1, 4, '08:00', '20:00', 60, 6, 'all'),
(1, 5, '08:00', '20:00', 60, 6, 'all'),
(1, 6, '09:00', '18:00', 60, 6, 'all'),
(1, 0, '09:00', '16:00', 60, 4, 'all'),
(2, 1, '07:00', '21:00', 60, 4, 'all'),
(2, 2, '07:00', '21:00', 60, 4, 'all'),
(2, 3, '07:00', '21:00', 60, 4, 'all'),
(2, 4, '07:00', '21:00', 60, 4, 'all'),
(2, 5, '07:00', '21:00', 60, 4, 'all'),
(2, 6, '08:00', '19:00', 60, 4, 'all'),
(2, 0, '09:00', '17:00', 60, 3, 'all')
ON CONFLICT (arena_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time;

-- Kategórie článkov
INSERT INTO article_categories (name, slug) VALUES
('Novinky', 'novinky'),
('Preteky', 'preteky'),
('Tréningy', 'treningy'),
('Akcie', 'akcie')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- HOTOVO!
-- =====================================================
SELECT 'Databáza v6.0 úspešne vytvorená!' as status;
