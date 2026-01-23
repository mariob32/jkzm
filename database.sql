-- =====================================================
-- JAZDECKÝ KLUB ZELENÁ MÍĽA - PROFESIONÁLNY SYSTÉM
-- Podľa pravidiel SJF, ŠVPS SR a FEI
-- =====================================================

-- =====================================================
-- TABUĽKA: KONE (HORSES)
-- Kompletná evidencia podľa ŠVPS a FEI
-- =====================================================
CREATE TABLE horses (
    id SERIAL PRIMARY KEY,
    
    -- Základné údaje
    name VARCHAR(100) NOT NULL,
    stable_name VARCHAR(50),                    -- Prezývka v stajni
    breed VARCHAR(100),                         -- Plemeno
    color VARCHAR(50),                          -- Farba
    sex VARCHAR(20) CHECK (sex IN ('stallion', 'mare', 'gelding')), -- Žrebec/Kobyla/Valach
    birth_date DATE,
    country_of_birth VARCHAR(3),                -- ISO kód krajiny
    
    -- IDENTIFIKÁCIA (ŠVPS povinné)
    passport_number VARCHAR(50) UNIQUE,         -- Číslo pasu koňa
    life_number VARCHAR(50) UNIQUE,             -- Životné číslo (UELN)
    microchip VARCHAR(15) UNIQUE,               -- Mikročip (ISO 11784) - povinný od 2013
    brand_description TEXT,                     -- Popis značiek/tetovanie
    
    -- FEI REGISTRÁCIA
    fei_id VARCHAR(20) UNIQUE,                  -- FEI identifikačné číslo
    fei_passport_number VARCHAR(50),            -- FEI pas (pre medzinárodné súťaže)
    fei_passport_expiry DATE,                   -- Platnosť FEI pasu
    fei_registered BOOLEAN DEFAULT FALSE,
    
    -- SJF REGISTRÁCIA
    sjf_license_number VARCHAR(20),             -- Licencia koňa SJF
    sjf_license_valid_until DATE,
    sjf_registration_date DATE,
    
    -- VLASTNÍCTVO
    owner_name VARCHAR(200),
    owner_contact TEXT,
    owner_address TEXT,
    
    -- PARAMETRE
    height_cm INTEGER,                          -- Kohútik v cm
    weight_kg INTEGER,                          -- Váha v kg
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced', 'children', 'competition')),
    disciplines TEXT[],                         -- Disciplíny: skoky, drezúra, všestrannosť, vytrvalosť, voltíž, záprahy
    
    -- STATUS
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'retired', 'sold', 'deceased', 'temporary_out')),
    location VARCHAR(100) DEFAULT 'JKZM',       -- Aktuálne umiestnenie
    
    -- INSURANCE
    insurance_company VARCHAR(100),
    insurance_policy VARCHAR(50),
    insurance_valid_until DATE,
    insurance_value DECIMAL(10,2),
    
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: VETERINÁRNE ZÁZNAMY (VET_RECORDS)
-- Kompletná evidencia podľa ŠVPS a FEI
-- =====================================================
CREATE TABLE vet_records (
    id SERIAL PRIMARY KEY,
    horse_id INTEGER REFERENCES horses(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN (
        'vaccination_flu',           -- Očkovanie chrípka (FEI: každých 6 mesiacov)
        'vaccination_tetanus',       -- Očkovanie tetanus
        'vaccination_rabies',        -- Besnota (nie je povinná pre kone v SR)
        'vaccination_ehv',           -- EHV-1 herpesvírus
        'vaccination_other',         -- Iné očkovanie
        'iae_test',                  -- Test na infekčnú anémiu (IAE) - každé 2-3 roky
        'coggins_test',              -- Coggins test
        'deworming',                 -- Odčervenie
        'dental',                    -- Zubné ošetrenie
        'farrier',                   -- Podkovanie/úprava kopýt
        'examination',               -- Veterinárna prehliadka
        'treatment',                 -- Liečba
        'surgery',                   -- Chirurgický zákrok
        'injury',                    -- Zranenie
        'fei_check'                  -- FEI veterinárna kontrola
    )),
    
    -- Detaily záznamu
    date DATE NOT NULL,
    next_due_date DATE,                         -- Dátum ďalšej potrebnej akcie
    veterinarian VARCHAR(200),                  -- Meno veterinára
    vet_license VARCHAR(50),                    -- Licencia veterinára
    clinic VARCHAR(200),                        -- Klinika
    
    -- Vakcinácia špecifické
    vaccine_name VARCHAR(100),                  -- Názov vakcíny
    vaccine_batch VARCHAR(50),                  -- Šarža
    vaccine_manufacturer VARCHAR(100),
    
    -- Liečba špecifické
    diagnosis TEXT,
    treatment_description TEXT,
    medication TEXT,
    dosage VARCHAR(100),
    withdrawal_period_days INTEGER,             -- Karenčná doba (dôležité pre súťaže)
    competition_clearance_date DATE,            -- Dátum od kedy môže súťažiť
    
    -- Dokumenty
    document_url TEXT,                          -- Sken dokumentu
    passport_entry_page INTEGER,                -- Strana v pase
    
    cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: JAZDCI (RIDERS)
-- Evidencia podľa SJF
-- =====================================================
CREATE TABLE riders (
    id SERIAL PRIMARY KEY,
    
    -- Osobné údaje
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    nationality VARCHAR(3),                     -- ISO kód
    
    -- Kontakt
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    emergency_contact VARCHAR(200),
    emergency_phone VARCHAR(50),
    
    -- SJF LICENCIA
    sjf_license_number VARCHAR(20) UNIQUE,      -- Číslo licencie SJF
    sjf_license_type VARCHAR(20) CHECK (sjf_license_type IN (
        'none',                                 -- Bez licencie (hobby)
        'szvj',                                 -- SZVJ - základný výcvik
        'national',                             -- Národná licencia
        'international'                         -- Medzinárodná licencia
    )),
    sjf_license_valid_until DATE,
    sjf_member_since DATE,
    szvj_date DATE,                             -- Dátum SZVJ skúšky
    szvj_certificate_number VARCHAR(50),
    
    -- FEI REGISTRÁCIA
    fei_id VARCHAR(20) UNIQUE,                  -- FEI ID
    fei_registered BOOLEAN DEFAULT FALSE,
    fei_license_valid_until DATE,
    
    -- KATEGÓRIA (podľa SJF)
    category VARCHAR(30) CHECK (category IN (
        'children',                             -- Deti (do 12 rokov)
        'pony',                                 -- Pony jazdci
        'junior',                               -- Juniori (14-18 rokov)
        'young_rider',                          -- Mladí jazdci (16-21)
        'senior',                               -- Seniori (21+)
        'amateur',                              -- Amatéri
        'professional'                          -- Profesionáli
    )),
    
    -- ÚROVEŇ A DISCIPLÍNY
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced', 'competition')),
    disciplines TEXT[],                         -- Skoky, drezúra, všestrannosť, vytrvalosť, voltíž
    highest_level_jumping VARCHAR(10),          -- Najvyššia dosiahnutá úroveň: ZM, Z, ZL, L, S, ST, T, TT
    highest_level_dressage VARCHAR(10),
    
    -- ZDRAVOTNÁ SPÔSOBILOSŤ
    medical_certificate_valid BOOLEAN DEFAULT FALSE,
    medical_certificate_date DATE,
    medical_certificate_expiry DATE,
    health_notes TEXT,                          -- Alergie, obmedzenia
    
    -- POISTENIE
    insurance_company VARCHAR(100),
    insurance_policy VARCHAR(50),
    insurance_valid_until DATE,
    
    -- GDPR
    gdpr_consent BOOLEAN DEFAULT FALSE,
    gdpr_consent_date DATE,
    photo_consent BOOLEAN DEFAULT FALSE,
    
    photo_url TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: TRÉNERI (TRAINERS)
-- Evidencia podľa SJF
-- =====================================================
CREATE TABLE trainers (
    id SERIAL PRIMARY KEY,
    
    -- Osobné údaje
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    
    -- SJF KVALIFIKÁCIA
    sjf_license_number VARCHAR(20),
    sjf_trainer_level INTEGER CHECK (sjf_trainer_level BETWEEN 1 AND 4),  -- 1-4 kvalifikačný stupeň
    sjf_license_valid_until DATE,
    
    -- Špecializácia
    specializations TEXT[],                     -- Skoky, drezúra, voltíž, atď.
    disciplines TEXT[],
    
    -- BEZÚHONNOSŤ (povinné pri práci s mládežou)
    criminal_record_check BOOLEAN DEFAULT FALSE,
    criminal_record_date DATE,
    criminal_record_valid_until DATE,
    works_with_minors BOOLEAN DEFAULT TRUE,
    
    -- VZDELANIE
    education TEXT,
    certifications TEXT[],
    courses_completed TEXT[],
    
    -- PRVÁ POMOC
    first_aid_certificate BOOLEAN DEFAULT FALSE,
    first_aid_valid_until DATE,
    
    -- Pracovné
    employment_type VARCHAR(20) CHECK (employment_type IN ('full_time', 'part_time', 'external', 'volunteer')),
    hourly_rate DECIMAL(10,2),
    monthly_salary DECIMAL(10,2),
    
    photo_url TEXT,
    bio TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: TRÉNINGY (TRAININGS)
-- =====================================================
CREATE TABLE trainings (
    id SERIAL PRIMARY KEY,
    
    -- Účastníci
    rider_id INTEGER REFERENCES riders(id),
    horse_id INTEGER REFERENCES horses(id),
    trainer_id INTEGER REFERENCES trainers(id),
    
    -- Časové údaje
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Typ tréningu
    training_type VARCHAR(30) CHECK (training_type IN (
        'individual',                           -- Individuálny
        'group',                                -- Skupinový
        'longe',                                -- Lonžovanie
        'jumping',                              -- Skoky
        'dressage',                             -- Drezúra
        'cross_country',                        -- Terén
        'theory',                               -- Teória
        'szvj_preparation',                     -- Príprava na SZVJ
        'competition_prep',                     -- Príprava na preteky
        'hippotherapy'                          -- Hipoterapia
    )),
    
    level VARCHAR(20),
    location VARCHAR(100),                      -- Jazdiarňa, vonkajší kolbisko, terén
    
    -- Obsah tréningu
    goals TEXT,                                 -- Ciele tréningu
    exercises TEXT,                             -- Cviky
    trainer_notes TEXT,                         -- Poznámky trénera
    rider_feedback TEXT,                        -- Spätná väzba jazdca
    
    -- Hodnotenie
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    progress_notes TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    cancellation_reason TEXT,
    
    -- Platba
    price DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: ZAMESTNANCI (EMPLOYEES)
-- =====================================================
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),                      -- Stajník, pomocník, admin
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    birth_date DATE,
    
    -- Pracovný pomer
    employment_start DATE,
    employment_end DATE,
    employment_type VARCHAR(20),
    contract_type VARCHAR(50),
    
    -- Mzda
    hourly_rate DECIMAL(10,2),
    monthly_salary DECIMAL(10,2),
    
    -- Dokumenty
    criminal_record_check BOOLEAN DEFAULT FALSE,
    first_aid_certificate BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: KŔMENIE (FEEDING)
-- =====================================================
CREATE TABLE feeding (
    id SERIAL PRIMARY KEY,
    horse_id INTEGER REFERENCES horses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    feeding_time VARCHAR(20) CHECK (feeding_time IN ('morning', 'noon', 'evening')),
    fed_by INTEGER REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feeding_items (
    id SERIAL PRIMARY KEY,
    feeding_id INTEGER REFERENCES feeding(id) ON DELETE CASCADE,
    feed_type VARCHAR(50) NOT NULL,             -- Seno, ovos, müsli, mrkva, jablko
    amount VARCHAR(50),                         -- Množstvo
    unit VARCHAR(20)                            -- kg, l, ks
);

-- =====================================================
-- TABUĽKA: PRETEKY A SÚŤAŽE (COMPETITIONS)
-- =====================================================
CREATE TABLE competitions (
    id SERIAL PRIMARY KEY,
    
    -- Základné info
    name VARCHAR(200) NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE,
    location VARCHAR(200),
    organizer VARCHAR(200),
    
    -- Typ pretekov
    competition_type VARCHAR(30) CHECK (competition_type IN (
        'national',                             -- Národné
        'international',                        -- Medzinárodné (CI)
        'regional',                             -- Regionálne
        'club',                                 -- Klubové
        'championship'                          -- Majstrovstvá
    )),
    
    -- FEI/SJF
    fei_code VARCHAR(20),                       -- FEI kód pretekov
    sjf_code VARCHAR(20),                       -- SJF kód pretekov
    
    discipline VARCHAR(30),                     -- Skoky, drezúra, všestrannosť
    levels TEXT[],                              -- Stupne: ZM, Z, ZL, L, S, ST, T, TT
    
    -- Deadlines
    entry_deadline DATE,
    payment_deadline DATE,
    
    -- Fees
    entry_fee DECIMAL(10,2),
    stable_fee DECIMAL(10,2),
    
    website TEXT,
    contact TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: PRIHLÁŠKY NA SÚŤAŽE (COMPETITION_ENTRIES)
-- =====================================================
CREATE TABLE competition_entries (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id),
    rider_id INTEGER REFERENCES riders(id),
    horse_id INTEGER REFERENCES horses(id),
    
    classes TEXT[],                             -- Súťaže/triedy
    entry_date DATE DEFAULT CURRENT_DATE,
    
    -- Veterinárne potvrdenie
    vet_check_passed BOOLEAN,
    vet_check_date DATE,
    
    -- Výsledky
    results JSONB,                              -- Výsledky jednotlivých súťaží
    
    -- Platba
    total_fee DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: PLATBY (PAYMENTS)
-- =====================================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    
    -- Komu
    rider_id INTEGER REFERENCES riders(id),
    
    -- Za čo
    payment_type VARCHAR(30) CHECK (payment_type IN (
        'membership',                           -- Členské
        'training',                             -- Tréning
        'stabling',                             -- Ustajnenie
        'competition',                          -- Preteky
        'equipment',                            -- Vybavenie
        'sjf_license',                          -- SJF licencia
        'fei_registration',                     -- FEI registrácia
        'vet_services',                         -- Veterinárne služby
        'other'
    )),
    
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Platba
    payment_date DATE,
    payment_method VARCHAR(20),
    invoice_number VARCHAR(50),
    
    -- Obdobie (pre opakované platby)
    period_start DATE,
    period_end DATE,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: ČLENSTVO V KLUBE (MEMBERSHIPS)
-- =====================================================
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    rider_id INTEGER REFERENCES riders(id),
    
    membership_type VARCHAR(30) CHECK (membership_type IN (
        'full',                                 -- Plné členstvo
        'training_only',                        -- Len tréningy
        'stabling_only',                        -- Len ustajnenie
        'family',                               -- Rodinné
        'student',                              -- Študentské
        'honorary'                              -- Čestné
    )),
    
    start_date DATE NOT NULL,
    end_date DATE,
    
    annual_fee DECIMAL(10,2),
    sjf_fee_included BOOLEAN DEFAULT FALSE,
    
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: UPOZORNENIA A NOTIFIKÁCIE
-- =====================================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    
    entity_type VARCHAR(30),                    -- horse, rider, trainer
    entity_id INTEGER,
    
    notification_type VARCHAR(50) CHECK (notification_type IN (
        'vaccination_due',                      -- Očkovanie
        'iae_test_due',                         -- IAE test
        'farrier_due',                          -- Podkovanie
        'dental_due',                           -- Zuby
        'license_expiry',                       -- Licencia
        'insurance_expiry',                     -- Poistenie
        'medical_certificate_expiry',           -- Lekárske potvrdenie
        'passport_expiry',                      -- FEI pas
        'membership_expiry',                    -- Členstvo
        'payment_due',                          -- Platba
        'competition_deadline'                  -- Uzávierka pretekov
    )),
    
    title VARCHAR(200),
    message TEXT,
    due_date DATE,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'resolved')),
    sent_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: KONTAKTNÝ FORMULÁR
-- =====================================================
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    service VARCHAR(100),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: REZERVÁCIE (web)
-- =====================================================
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    service VARCHAR(100),
    preferred_date DATE,
    preferred_time TIME,
    experience_level VARCHAR(50),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    confirmed_date DATE,
    confirmed_time TIME,
    assigned_trainer_id INTEGER REFERENCES trainers(id),
    assigned_horse_id INTEGER REFERENCES horses(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABUĽKA: ADMIN POUŽÍVATELIA
-- =====================================================
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200),
    role VARCHAR(20) DEFAULT 'admin',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXY PRE VÝKON
-- =====================================================
CREATE INDEX idx_horses_status ON horses(status);
CREATE INDEX idx_horses_fei_id ON horses(fei_id);
CREATE INDEX idx_horses_sjf_license ON horses(sjf_license_number);
CREATE INDEX idx_vet_records_horse ON vet_records(horse_id);
CREATE INDEX idx_vet_records_type ON vet_records(record_type);
CREATE INDEX idx_vet_records_next_due ON vet_records(next_due_date);
CREATE INDEX idx_riders_sjf_license ON riders(sjf_license_number);
CREATE INDEX idx_riders_fei_id ON riders(fei_id);
CREATE INDEX idx_trainings_date ON trainings(date);
CREATE INDEX idx_trainings_rider ON trainings(rider_id);
CREATE INDEX idx_competitions_date ON competitions(date_start);
CREATE INDEX idx_payments_rider ON payments(rider_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_notifications_due ON notifications(due_date);
CREATE INDEX idx_notifications_status ON notifications(status);

-- =====================================================
-- VLOŽENIE DEMO DÁT
-- =====================================================

-- Admin používateľ
INSERT INTO admin_users (email, password_hash, name, role) VALUES
('admin@jkzm.sk', '$2b$10$rQZQZQZQZQZQZQZQZQZQZOdummyhashvalue', 'Admin JKZM', 'superadmin');

-- Demo kone s kompletnými údajmi
INSERT INTO horses (name, stable_name, breed, color, sex, birth_date, passport_number, life_number, microchip, fei_id, sjf_license_number, owner_name, height_cm, weight_kg, level, disciplines, status) VALUES
('Gentleman Z', 'Gento', 'Zangersheide', 'Bay', 'gelding', '2015-04-12', 'SVK-2015-12345', '703099000012345', '941000012345678', 'SVK40123', 'SK-H-2015-001', 'Jazdecký klub Zelená míľa', 172, 580, 'competition', ARRAY['skoky', 'drezúra'], 'active'),
('Luna Star', 'Luna', 'Slovenský teplokrvník', 'Chestnut', 'mare', '2017-06-20', 'SVK-2017-23456', '703099000023456', '941000023456789', NULL, 'SK-H-2017-002', 'Jazdecký klub Zelená míľa', 165, 520, 'intermediate', ARRAY['drezúra'], 'active'),
('Šibal', 'Šibi', 'Hafling', 'Palomino', 'gelding', '2014-03-05', 'SVK-2014-34567', '703099000034567', '941000034567890', NULL, 'SK-H-2014-003', 'Jazdecký klub Zelená míľa', 148, 450, 'children', ARRAY['voltíž'], 'active'),
('Blesk', 'Blesko', 'Lipican', 'Grey', 'stallion', '2012-05-15', 'SVK-2012-45678', '703099000045678', '941000045678901', 'SVK40456', 'SK-H-2012-004', 'Jazdecký klub Zelená míľa', 162, 550, 'advanced', ARRAY['drezúra', 'skoky'], 'active'),
('Čert', 'Čertík', 'Slovenský teplokrvník', 'Black', 'gelding', '2016-08-10', 'SVK-2016-56789', '703099000056789', '941000056789012', NULL, 'SK-H-2016-005', 'Súkromný majiteľ', 170, 560, 'competition', ARRAY['skoky'], 'active');

-- Demo veterinárne záznamy
INSERT INTO vet_records (horse_id, record_type, date, next_due_date, veterinarian, vaccine_name, notes) VALUES
(1, 'vaccination_flu', '2024-06-15', '2024-12-15', 'MVDr. Ján Kováč', 'Proteqflu-Te', 'Pravidelné očkovanie chrípka'),
(1, 'iae_test', '2024-01-20', '2027-01-20', 'MVDr. Ján Kováč', NULL, 'Negatívny'),
(1, 'farrier', '2024-09-01', '2024-11-01', 'Podkovač Peter Novák', NULL, 'Podkovanie všetkých 4 kopýt'),
(2, 'vaccination_flu', '2024-07-01', '2025-01-01', 'MVDr. Ján Kováč', 'Proteqflu-Te', 'Pravidelné očkovanie'),
(2, 'dental', '2024-03-15', '2025-03-15', 'MVDr. Ján Kováč', NULL, 'Kontrola a úprava zubov'),
(3, 'vaccination_flu', '2024-08-10', '2025-02-10', 'MVDr. Ján Kováč', 'Proteqflu-Te', 'OK'),
(4, 'vaccination_flu', '2024-05-20', '2024-11-20', 'MVDr. Ján Kováč', 'Proteqflu-Te', 'FEI požiadavka - každých 6 mes'),
(5, 'vaccination_flu', '2024-06-01', '2024-12-01', 'MVDr. Ján Kováč', 'Proteqflu-Te', 'OK');

-- Demo tréneri
INSERT INTO trainers (first_name, last_name, email, phone, sjf_license_number, sjf_trainer_level, specializations, employment_type, bio, status) VALUES
('Mária', 'Horváthová', 'maria@jkzm.sk', '+421 901 111 222', 'TR-001-2020', 2, ARRAY['skoky', 'drezúra'], 'full_time', 'Skúsená trénerka s 15-ročnou praxou. Špecializácia na skoky a drezúru.', 'active'),
('Peter', 'Kováč', 'peter@jkzm.sk', '+421 902 333 444', 'TR-002-2018', 3, ARRAY['drezúra', 'voltíž'], 'full_time', 'Certifikovaný tréner 3. stupňa. Špecialista na prácu s deťmi.', 'active'),
('Jana', 'Nováková', 'jana@jkzm.sk', '+421 903 555 666', 'TR-003-2021', 1, ARRAY['začiatočníci'], 'part_time', 'Trénerka pre začiatočníkov a hobby jazdcov.', 'active');

-- Demo jazdci
INSERT INTO riders (first_name, last_name, birth_date, gender, email, phone, sjf_license_number, sjf_license_type, sjf_license_valid_until, category, level, disciplines, medical_certificate_valid, status) VALUES
('Anna', 'Malá', '2010-05-15', 'female', 'anna.mala@email.com', '+421 911 111 111', 'SK-R-2022-001', 'szvj', '2025-12-31', 'children', 'beginner', ARRAY['skoky'], TRUE, 'active'),
('Tomáš', 'Veľký', '2005-08-20', 'male', 'tomas.velky@email.com', '+421 911 222 222', 'SK-R-2021-002', 'national', '2025-12-31', 'junior', 'advanced', ARRAY['skoky', 'drezúra'], TRUE, 'active'),
('Eva', 'Nová', '1990-03-10', 'female', 'eva.nova@email.com', '+421 911 333 333', 'SK-R-2020-003', 'international', '2025-12-31', 'senior', 'competition', ARRAY['skoky'], TRUE, 'active'),
('Martin', 'Starý', '1985-11-25', 'male', 'martin.stary@email.com', '+421 911 444 444', NULL, 'none', NULL, 'amateur', 'intermediate', ARRAY['drezúra'], TRUE, 'active'),
('Lucia', 'Krásna', '2008-07-30', 'female', 'lucia.krasna@email.com', '+421 911 555 555', 'SK-R-2023-005', 'szvj', '2025-12-31', 'junior', 'intermediate', ARRAY['skoky'], TRUE, 'active');

-- Demo zamestnanci
INSERT INTO employees (first_name, last_name, position, email, phone, employment_type, status) VALUES
('Jozef', 'Stajník', 'Hlavný stajník', 'jozef@jkzm.sk', '+421 904 111 222', 'full_time', 'active'),
('Marta', 'Pomocná', 'Pomocník v stajni', 'marta@jkzm.sk', '+421 904 333 444', 'part_time', 'active');

-- Demo tréningy
INSERT INTO trainings (rider_id, horse_id, trainer_id, date, start_time, duration_minutes, training_type, level, status, price) VALUES
(1, 3, 2, CURRENT_DATE, '15:00', 45, 'individual', 'beginner', 'scheduled', 25.00),
(2, 1, 1, CURRENT_DATE, '16:00', 60, 'jumping', 'advanced', 'scheduled', 35.00),
(3, 4, 1, CURRENT_DATE + 1, '10:00', 60, 'competition_prep', 'competition', 'scheduled', 40.00),
(5, 2, 3, CURRENT_DATE + 1, '14:00', 45, 'dressage', 'intermediate', 'scheduled', 30.00);

-- Demo preteky
INSERT INTO competitions (name, date_start, date_end, location, organizer, competition_type, discipline, levels, entry_deadline) VALUES
('Jarné parkúrové preteky JKZM', '2025-04-15', '2025-04-16', 'JK Zelená míľa, Jaslovské Bohunice', 'JK Zelená míľa', 'regional', 'skoky', ARRAY['ZM', 'Z', 'ZL', 'L'], '2025-04-01'),
('Majstrovstvá Trnavského kraja', '2025-05-20', '2025-05-21', 'Trnava', 'SJF - TT oblasť', 'regional', 'skoky', ARRAY['L', 'S', 'ST'], '2025-05-01'),
('Letný drezúrny deň', '2025-06-10', '2025-06-10', 'JK Zelená míľa', 'JK Zelená míľa', 'club', 'drezúra', ARRAY['ZM', 'Z', 'ZL'], '2025-06-01');

-- Demo notifikácie (automatické upozornenia)
INSERT INTO notifications (entity_type, entity_id, notification_type, title, message, due_date, status) VALUES
('horse', 1, 'vaccination_due', 'Očkovanie chrípka - Gentleman Z', 'Blíži sa termín očkovania proti chrípke (FEI požiadavka).', '2024-12-15', 'pending'),
('horse', 4, 'vaccination_due', 'Očkovanie chrípka - Blesk', 'Blíži sa termín očkovania proti chrípke.', '2024-11-20', 'pending'),
('rider', 2, 'license_expiry', 'SJF licencia - Tomáš Veľký', 'Licencia SJF vyprší o 60 dní.', '2025-12-31', 'pending');
-- ============================================
-- JKZM - Seed data pre kontakty odborníkov
-- Podkúvači, Veterinári, Prepravcovia, atď.
-- ============================================

-- Tabuľka pre externých dodávateľov/kontakty
CREATE TABLE IF NOT EXISTS contacts_directory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL, -- farrier, veterinarian, transport, judge, course_builder
    name VARCHAR(200) NOT NULL,
    company VARCHAR(200),
    phone VARCHAR(50),
    phone2 VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),
    address TEXT,
    region VARCHAR(100), -- Bratislavský, Nitriansky, Košický, etc.
    services TEXT[], -- Array of services
    price_info TEXT,
    notes TEXT,
    rating DECIMAL(2,1), -- 1.0 - 5.0
    verified BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pre rýchle vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts_directory(category);
CREATE INDEX IF NOT EXISTS idx_contacts_region ON contacts_directory(region);

-- ============================================
-- PODKÚVAČI (KOVÁČI)
-- ============================================
INSERT INTO contacts_directory (category, name, company, phone, website, region, services, price_info, notes, verified) VALUES
('farrier', 'Peagas Farrier Slovakia', 'Peagas Farrier Slovakia', '0918562092', 'facebook.com/peagasfarrierslovakia', 'Celé Slovensko', 
 ARRAY['Korekcia kopýt', 'Podkúvanie', 'Ortopedické podkúvanie', 'Korekcia podľa Hiltrude Strassera'],
 'Korekcia športových koní: 15€, Podkúvanie športových koní: 50€, Ťažné kone: 60€',
 'Medzinárodná licencia IVVL, množstvo recenzií na Facebooku', true),

('farrier', 'Ján Kurtík', NULL, NULL, NULL, 'Žilinský', 
 ARRAY['Korekcia kopýt', 'Podkúvanie', 'Prekúvanie'],
 'Cena dohodou',
 'Dlhoročný podkúvač z Jasenovej, pôsobí v Turci a okolí', false);

-- ============================================
-- VETERINÁRI PRE KONE
-- ============================================
INSERT INTO contacts_directory (category, name, company, phone, phone2, email, website, address, region, services, notes, verified) VALUES
('veterinarian', 'Klinika koní UVLF', 'Univerzita veterinárskeho lekárstva a farmácie', '+421905579559', '+421915991474', NULL, 'www.uvlf.sk', 'Komenského 73, Košice', 'Košický',
 ARRAY['24h pohotovosť pre koliky', 'Chirurgia', 'Ortopédia', 'Reprodukcia', 'Inseminácia', 'Hospitalizácia', 'Zobrazovacia diagnostika'],
 'Univerzitná klinika, 24h servis, operačná pohotovosť', true),

('veterinarian', 'Veterinárna klinika Sliač', 'Veterinárna klinika Sliač', NULL, NULL, NULL, 'www.veterinar-sliac.sk', 'Sliač', 'Banskobystrický',
 ARRAY['Hipiatria', 'Akupunktúra', 'Tradičná čínska medicína', 'Ortopédia', 'Interná medicína', 'Výjazdy'],
 'Špecializácia na kone, výjazdy k zákazníkom', true),

('veterinarian', 'Fazivet Nitra', 'Fazivet s.r.o.', NULL, NULL, NULL, 'fazivet.sk', 'Nitra', 'Nitriansky',
 ARRAY['Interná medicína koní', 'Chirurgia', 'Urgentné zákroky', 'Inseminácia', 'Kontrola gravidity', 'Ultrazvuk', 'Výjazdy'],
 'Dlhodobo sa venujú koňom, výjazdy v Nitre a okolí', true),

('veterinarian', 'Vetklinika Ružinov', 'Vetklinika s.r.o.', NULL, NULL, NULL, 'www.vetklinika.sk', 'Bratislava - Ružinov', 'Bratislavský',
 ARRAY['Domáce zvieratá', 'Hospodárske zvieratá', 'Kone', 'Diagnostika', 'Chirurgia'],
 'Ošetrujú aj kone', true),

('veterinarian', 'MVDr. Jana Morvayová', 'Mobilná veterinárna ambulancia', NULL, NULL, NULL, 'www.vyjazdovyveterinar.sk', 'Bratislava a okolie', 'Bratislavský',
 ARRAY['Výjazdy ku koňom', 'Vakcinácie', 'Preventívna starostlivosť'],
 'Dcéra koňského veterinára, dlhoročná prax s koňmi, len výjazdy', true),

('veterinarian', 'MVDr. Juraj Skalický', 'Zverolekár Košice', '0905272452', NULL, 'skalicky.juraj@gmail.com', 'zverolekarkosice.sk', 'Košice', 'Košický',
 ARRAY['Kone', 'Hovädzí dobytok', 'Ovce', 'Kozy', 'Exotické zvieratá', 'Mobilná ambulancia'],
 'Spolupráca so ZOO Košice, imobilizácia zvery', true);

-- ============================================
-- PREPRAVNÉ SPOLOČNOSTI
-- ============================================
INSERT INTO contacts_directory (category, name, company, phone, email, website, region, services, notes, verified) VALUES
('transport', 'ZT Horse Transport', 'ZT Horse Transport', NULL, NULL, 'prepravakoni.sk', 'Celé Slovensko',
 ARRAY['Medzinárodná preprava', 'Vnútroštátna preprava', 'NONSTOP veterinárna preprava', 'Pomoc s TRACES', 'Preprava 4 koní'],
 'NONSTOP prevoz na kliniky Brno, Košice, Viedeň, Budapešť', true),

('transport', 'K2 Horses Taxi', 'K2 Horses Taxi', NULL, NULL, 'k2horsestaxi.sk', 'Celé Slovensko',
 ARRAY['T1 licencia (do 8h)', 'T2 licencia (nad 8h)', 'Medzinárodná preprava', 'Kamera vo vozíku', 'Poistenie'],
 'Preprava do PL, CZ, AT, HU, moderné vybavenie', true),

('transport', 'Equitravel', 'Miroslav Pavelka', '+420608980657', 'info@PrepravaKoni.cz', 'www.prepravakoni.cz', 'CZ + SK',
 ARRAY['Štandardná preprava', 'Veterinárna preprava', 'Preprava problémových koní'],
 'Českí prepravcovia, 30+ rokov skúseností, tisíce koní', true),

('transport', 'Horse Transport Thomas', NULL, '731278769', NULL, 'www.horsetransportthomas.eu', 'CZ + SK',
 ARRAY['Preprava na závody', 'Sústredenia', 'Výstavy', 'Servis prepravníkov'],
 'Projekt Koňská Ambulance Hradec Králové', false);

-- ============================================
-- JAZDECKÉ ORGANIZÁCIE
-- ============================================
INSERT INTO contacts_directory (category, name, company, phone, email, website, address, region, services, notes, verified) VALUES
('organization', 'Slovenská jazdecká federácia', 'SJF', '+421905643661', 'info@sjf.sk', 'www.sjf.sk', 'Olympijské námestie 14290/1, 832 80 Bratislava', 'Bratislavský',
 ARRAY['Evidencia jazdcov a koní', 'Licencie SJF', 'Kalendár pretekov', 'Školenia rozhodcov', 'SZVJ skúšky'],
 'Národný riadiaci orgán jazdeckého športu', true),

('organization', 'ŠVPS SR', 'Štátna veterinárna a potravinová správa SR', NULL, NULL, 'www.svps.sk', 'Bratislava', 'Celé Slovensko',
 ARRAY['Veterinárne certifikáty', 'Pasy koní', 'TRACES systém', 'Import/Export'],
 'Štátny orgán pre veterinárne záležitosti', true),

('organization', 'IVVL', 'Inštitút vzdelávania veterinárnych lekárov', NULL, NULL, NULL, NULL, 'Celé Slovensko',
 ARRAY['Kurz kováč-podkúvač', 'Kurz paznechtár'],
 'Kurz kováč-podkúvač: 740€, 20 dní', false);

-- ============================================
-- JAZDECKÉ AREÁLY
-- ============================================
INSERT INTO contacts_directory (category, name, company, website, address, region, services, notes, verified) VALUES
('venue', 'x-bionic® sphere Šamorín', 'x-bionic® sphere', NULL, 'Šamorín', 'Bratislavský',
 ARRAY['CSIO5* preteky', '680 stajní', 'Trávnatý povrch', 'Pieskový povrch', 'Dostihová dráha'],
 'Medzinárodný areál, Nations Cup', true),

('venue', 'JK Masarykov Dvor', 'JK Masarykov Dvor', NULL, 'Vígľaš-Pstruša', 'Banskobystrický',
 ARRAY['MSR všestrannosť', 'Jazdecká hala', 'Cross-country trať'],
 'Všestranná spôsobilosť, sústredenia', true),

('venue', 'Slovak Jumping Academy Prešov', 'SJA Prešov', NULL, 'Prešov', 'Prešovský',
 ARRAY['Halové preteky', 'Tréningové centrum', 'Národné centrum mládeže'],
 'Národné jazdecké tréningové centrum pre deti a mládež', true),

('venue', 'JK Czajlik Ranch', 'Czajlik Ranch', NULL, 'Dunajský Klátov', 'Bratislavský',
 ARRAY['Hall Showjumping Tour', 'Halové preteky'],
 'Zimné halové preteky', true),

('venue', 'JK Rozálka Pezinok', 'JK Rozálka', NULL, 'Pezinok', 'Bratislavský',
 ARRAY['MSR pony', 'MSR juniorov', 'Regionálne preteky'],
 'Malokarpatská oblasť', true);

-- ============================================
-- VIEW pre jednoduché vyhľadávanie
-- ============================================
CREATE OR REPLACE VIEW v_contacts_by_category AS
SELECT 
    category,
    name,
    company,
    phone,
    email,
    website,
    region,
    services,
    verified
FROM contacts_directory
WHERE active = true
ORDER BY category, verified DESC, name;

-- Funkcia pre vyhľadávanie kontaktov
CREATE OR REPLACE FUNCTION search_contacts(
    p_category VARCHAR DEFAULT NULL,
    p_region VARCHAR DEFAULT NULL,
    p_search VARCHAR DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    category VARCHAR,
    name VARCHAR,
    company VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    website VARCHAR,
    region VARCHAR,
    services TEXT[],
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cd.id, cd.category, cd.name, cd.company, 
        cd.phone, cd.email, cd.website, cd.region,
        cd.services, cd.notes
    FROM contacts_directory cd
    WHERE cd.active = true
        AND (p_category IS NULL OR cd.category = p_category)
        AND (p_region IS NULL OR cd.region ILIKE '%' || p_region || '%')
        AND (p_search IS NULL OR 
             cd.name ILIKE '%' || p_search || '%' OR
             cd.company ILIKE '%' || p_search || '%' OR
             cd.notes ILIKE '%' || p_search || '%')
    ORDER BY cd.verified DESC, cd.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Príklady použitia
-- ============================================
-- SELECT * FROM search_contacts('veterinarian', 'Košický', NULL);
-- SELECT * FROM search_contacts('farrier', NULL, NULL);
-- SELECT * FROM search_contacts(NULL, NULL, 'kone');
-- SELECT * FROM v_contacts_by_category WHERE category = 'transport';

-- =====================================================
-- SJF REGISTRE - Externé referenčné tabuľky
-- Pre synchronizáciu s evidencia.sjf.sk
-- =====================================================

-- Tabuľka: SJF Kluby
CREATE TABLE IF NOT EXISTS sjf_clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    street VARCHAR(255),
    postal_code VARCHAR(10),
    house_number VARCHAR(20),
    region VARCHAR(5),
    city VARCHAR(100),
    is_riding_school BOOLEAN DEFAULT FALSE,
    statutory VARCHAR(255),
    contact_person VARCHAR(255),
    phone VARCHAR(100),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Neaktívny',
    sjf_import_date TIMESTAMP DEFAULT NOW(),
    sjf_last_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka: SJF Osoby
CREATE TABLE IF NOT EXISTS sjf_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surname VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    club_name VARCHAR(255),
    region VARCHAR(5),
    sjf_license_status VARCHAR(20),
    sjf_license_number VARCHAR(20),
    fei_license_status VARCHAR(20),
    is_talented_athlete BOOLEAN DEFAULT FALSE,
    badge_gold BOOLEAN DEFAULT FALSE,
    badge_silver BOOLEAN DEFAULT FALSE,
    badge_bronze BOOLEAN DEFAULT FALSE,
    is_riding_school_student BOOLEAN DEFAULT FALSE,
    general_rules BOOLEAN DEFAULT FALSE,
    rider_license VARCHAR(50),
    judge_license VARCHAR(50),
    trainer_license VARCHAR(50),
    course_builder_license VARCHAR(50),
    steward_license VARCHAR(50),
    fei_vet_license VARCHAR(50),
    sjf_vet_judge_license VARCHAR(50),
    technical_delegate VARCHAR(50),
    sjf_official VARCHAR(255),
    mcras_official VARCHAR(255),
    fei_treating_vet VARCHAR(50),
    member_type VARCHAR(50),
    lunger_license VARCHAR(50),
    main_discipline VARCHAR(100),
    secondary_discipline VARCHAR(100),
    voltiz VARCHAR(50),
    sjf_import_date TIMESTAMP DEFAULT NOW(),
    sjf_last_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabuľka: SJF Kone
CREATE TABLE IF NOT EXISTS sjf_horses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sjf_license_number VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    life_number VARCHAR(50),
    club_name VARCHAR(255),
    gender VARCHAR(20),
    sjf_license_status VARCHAR(20),
    fei_license_status VARCHAR(20),
    fei_license_number VARCHAR(20),
    birth_date DATE,
    color VARCHAR(50),
    breed VARCHAR(100),
    sire VARCHAR(255),
    dam VARCHAR(255),
    disciplines TEXT,
    sjf_import_date TIMESTAMP DEFAULT NOW(),
    sjf_last_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync log
CREATE TABLE IF NOT EXISTS sjf_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(20) NOT NULL,
    sync_date TIMESTAMP DEFAULT NOW(),
    records_total INTEGER,
    records_added INTEGER,
    records_updated INTEGER,
    records_unchanged INTEGER,
    file_hash VARCHAR(64),
    notes TEXT
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_sjf_clubs_name ON sjf_clubs(name);
CREATE INDEX IF NOT EXISTS idx_sjf_clubs_status ON sjf_clubs(status);
CREATE INDEX IF NOT EXISTS idx_sjf_clubs_region ON sjf_clubs(region);
CREATE INDEX IF NOT EXISTS idx_sjf_persons_name ON sjf_persons(surname, first_name);
CREATE INDEX IF NOT EXISTS idx_sjf_persons_license ON sjf_persons(sjf_license_number);
CREATE INDEX IF NOT EXISTS idx_sjf_persons_judge ON sjf_persons(judge_license) WHERE judge_license IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sjf_persons_trainer ON sjf_persons(trainer_license) WHERE trainer_license IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sjf_persons_builder ON sjf_persons(course_builder_license) WHERE course_builder_license IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sjf_horses_name ON sjf_horses(name);
CREATE INDEX IF NOT EXISTS idx_sjf_horses_life_number ON sjf_horses(life_number);

-- =====================================================
-- SJF SEED DATA - Aktívne kluby a funkcionári
-- Export z evidencia.sjf.sk dňa 20.01.2025
-- =====================================================

-- AKTÍVNE KLUBY (50)
INSERT INTO sjf_clubs (name, street, postal_code, house_number, region, city, is_riding_school, statutory, contact_person, phone, email, status) VALUES
('AL ASIL Liptovský Mikuláš', 'Beňadiková', '03204', '110', 'S', 'Liptovský Mikuláš', TRUE, 'Feras Boulbol', 'Charlotte Mlynčeková', '0944/940023', 'feiruz.boulbolova@gmail.com', 'Aktívny'),
('BMM Belá - Dulice', 'Folkušová', '03842', '108', 'S', 'Folkušová', FALSE, 'JUDr. Pavol Krišpinský, LL.M.', 'Mgr. Eva Krišpinská', '0918740241', 'marrubium8@gmail.com', 'Aktívny'),
('CRAZY TEAM Hajnáčka', 'Hajnáčka', '98033', '286', 'S', 'Hajnáčka', TRUE, 'Bc. Kristína Pelleová', 'Bc. Kristína Pelleová', '0908/940893', 'milordkiki@gmail.com', 'Aktívny'),
('EQUESTRIAN Poprad', 'Hôrka', '05912', '1051', '-', 'Hôrka', FALSE, 'Ing. Jaroslava Danko', 'Ing. Jaroslava Danko', '0910/987778', 'dankojaroslava@gmail.com', 'Aktívny'),
('EQUINIBRIUM AMH Vlkanová', 'Matuškova', '97631', '48', '-', 'Vlkanová', FALSE, 'Amália Hudobová', 'Amália Hudobová', '0950/522899', 'amy@equinibrium.sk', 'Aktívny'),
('EQUIPOINT HREUS Žilina', 'Mojšova Lúčka', '01001', '-', 'S', 'Žilina', FALSE, 'MVDr. Marián Hreus', 'MVDr. Marián Hreus', '0915/874771', 'marian@hreus.sk', 'Aktívny'),
('EquiStyle Club Lehnice', 'Kolónia', '93037', '467', '-', 'Lehnice', FALSE, 'Matej Pinďák', 'Claudia Belešová', '0905/402798', 'equistyle@equistyle.sk', 'Aktívny'),
('EQUITANA SPORT HORSES Bratislava', 'Vápenka', '84108', '15', 'B', 'Bratislava', FALSE, 'Daniel Ouzký', 'Daniel Ouzký', '0915/067563', 'ouzkydaniel@gmail.com', 'Aktívny'),
('FARAO Trnovec nad Váhom', 'Športová', '92501', '244', 'Z', 'Trnovec nad Váhom', TRUE, 'Vladimíra Lenčéšová', 'Vladimíra Lenčéšová', '0907/050355', 'vladimira.lencesova@zoznam.sk', 'Aktívny'),
('GREENFIELD SPORT HORSES Hôrka', 'Hôrka', '05912', '-', 'V', 'Poprad', FALSE, 'Samuel Matejka', 'Katarína Matejková', '0917/530193', 'samuel.matejka44@gmail.com', 'Aktívny'),
('HARMÓNIA V SEDLE Ivanka pri Dunaji', 'Poľovnícka', '90028', '1633', 'B', 'Ivanka pri Dunaji', FALSE, 'Miroslav Slobodník', 'Anežka Slobodníková', '0915/583146', 'jazmonia13@gmail.com', 'Aktívny'),
('HORSE AREA Vysoké Tatry', 'Priekopa', '06001', '23', 'V', 'Kežmarok', FALSE, 'Peter Mikulášik', 'Peter Mikulášik', '0905/406456', 'mikulasikpeter@gmail.com', 'Aktívny'),
('HORSE CLUB CHADAR Hrušov', 'Hrušov', '99142', '482', '-', 'Hrušov', FALSE, 'Ing. Matej Knopp', 'Filip Molek', '0948/940530', 'info@terraservis.sk', 'Aktívny'),
('JA TARTAROS Pečeňany', 'Pečeňany', '95636', '211', '-', 'Pečeňany', TRUE, 'Kristína Balažovičová', 'Kristína Balažovičová', '0948/837401', 'kris.balazovicova@gmail.com', 'Aktívny'),
('JK ACER Prešov', 'Sekčovská', '08001', '87', 'V', 'Prešov', TRUE, 'Monika Imreová', 'Monika Imreová', '0918/282096', 'jkacerpresov@gmail.com', 'Aktívny'),
('JK ALEXANDRIA Hviezdoslavov', 'Farma Hviezdoslavov', '93041', '134', 'Z', 'Hviezdoslavov', FALSE, 'Ján Skatulla', 'Jarmila Skatullová', '0907/716124', 'skatullova.jarka@gmail.com', 'Aktívny'),
('JK ALLFOR Bratislava', 'Prešovská', '82102', '45', 'B', 'Bratislava', FALSE, 'Ing. Jozef Drozd', 'Ing. Ingrid Drozd Janečková', '0905/342021', 'ingrid.allfor@gmail.com', 'Aktívny'),
('JK EL ZORRO Veľký Kýr', 'Nitrianska cesta', '95113', '753', 'Z', 'Branč', TRUE, 'Ing. Stanislava Zorádová', 'Ing. Stanislava Zorádová', '0907/212787', 'info@elzorro.sk', 'Aktívny'),
('JK ENIMO Slatinské Lazy', 'Slatinské Lazy', '96225', '73', 'B', 'Slatinské Lazy', FALSE, 'Martina Výbohová', 'Martina Výbohová', '0911/120024', 'jazdeckyklubenimo@gmail.com', 'Aktívny'),
('JK EPONA MÚTNIK Liptovský Mikuláš', 'Mútnik', '03101', '1', 'S', 'Liptovský Mikuláš', FALSE, 'Oto Macko', 'Oto Macko', '0903/153803', 'oto28macko@gmail.com', 'Aktívny'),
('JK EQUIDA Prievidza', 'Severná', '97101', '2787', 'Z', 'Prievidza', TRUE, 'Milada Petrušková', 'Milada Petrušková', '0915/288941', 'areal.equida@gmail.com', 'Aktívny'),
('JK EQUINOX Modrová', 'Modrová', '91635', '240', 'Z', 'Modrová', FALSE, 'Ing. Mária Kurtišová', 'Ing. Mária Kurtišová', '0905/610221', 'jk.equinox@gmail.com', 'Aktívny'),
('JK FADEX Miloslavov', 'Jazerná', '90042', '10', 'B', 'Miloslavov', TRUE, 'Monika Fišerová', 'Monika Jány Fišerová', '0908/628231', 'fiserova.monika@gmail.com', 'Aktívny'),
('JK FREESTYLE Poprad', 'Ranč', '05315', '208', 'V', 'Betlanovce', TRUE, 'Mgr. Lucie Tonkovičová', 'Ing. Jozef Janiga', '0903/624847', 'janiga.jozo@gmail.com', 'Aktívny'),
('JK LARISA Trebišov', 'Mlynská', '07622', '181', 'V', 'Hriadky', TRUE, 'Iveta Kelečei', 'Iveta Kelečei', '0908/210281', 'jazdectvolarisa@gmail.com', 'Aktívny'),
('JK LIMIT Bratislava', 'Vývojová', '85110', '857', 'B', 'Bratislava', TRUE, 'Alica Gbúrová', 'Alica Gbúrová', '0911/357511', 'alica.gburova@gmail.com', 'Aktívny'),
('JK LINDA Prievidza', 'Malá Čausa', '97101', '316', 'Z', 'Prievidza', FALSE, 'Ing. Andrej Slanina', 'Ing. Simona Slaninová', '0915/748253', 'slaninovasima@gmail.com', 'Aktívny'),
('JK MALÝ MAJER Hrabušice', 'Hlavná', '05315', '14', 'V', 'Hrabušice', FALSE, 'Ing. Zuzana Labudová', 'Ing. Zuzana Labudová', '0907/999384', 'zuzkalabudova@gmail.com', 'Aktívny'),
('JK MASARYKOV DVOR Vígľaš - Pstruša', 'Pstruša', '96202', '361', 'S', 'Vígľaš', TRUE, 'Martin Malatinec', 'Ľubomír Paučo', '0915/805634', 'malatinec@agrosev.sk', 'Aktívny'),
('JK MONTY RANČ Nitrianske Pravno', 'Jilemnického', '97213', '32', 'Z', 'Nitrianske Pravno', FALSE, 'Róbert Rovný', 'Katarína Rovná', '0905/454508', 'info@montyranc.sk', 'Aktívny'),
('JK NAPOLI Bratislava', 'Dubová x-bionic sphere', '93101', '33', 'B', 'Šamorín', TRUE, 'Dušan Krivosudský', 'Daniela Dovalová', '0903/614922', 'dusan.krivosudsky@napoli.sk', 'Aktívny'),
('JK Podtureň', 'Podtureň', '03301', '239', 'S', 'Podtureň', TRUE, 'Zuzana Hanáková', 'Zuzana Hanáková', '0905/523870', 'zuzanahanakova@pobox.sk', 'Aktívny'),
('JK RANČ LHOTA Dubnica nad Váhom', 'Prejtská', '01841', '487', 'Z', 'Dubnica nad Váhom', FALSE, 'Mária Suchánek', 'Mária Suchánek', '0902/964195', 'mariasuchanek@ranclhota.sk', 'Aktívny'),
('JK ROLLERS Rakúsy-Kežmarok', 'Rakúsy', '05976', '2', '-', 'Rakúsy', TRUE, 'Ing. Zuzana Šlosárová', 'Ing. Zuzana Šlosárová', '0905/730940', 'komunikmanager@gmail.com', 'Aktívny'),
('JK SAIDA Bratislava', 'Agátový rad', '93101', '1', 'B', 'Šamorín', FALSE, 'Ing. Ivana Urminská', 'Ľuba Polonyová', '0902/175440', 'ivanka.urminska@gmail.com', 'Aktívny'),
('JK SCARLETT Šamorín', 'Agátový rad', '93101', '1', '-', 'Šamorín', TRUE, 'Silvia Záhorská', 'Silvia Záhorská', '0948/328811', 'info@scarlett.sk', 'Aktívny'),
('JK SLÁVIA Spišská Nová Ves', 'Kamenný obrázok', '05201', '8', 'V', 'Spišská Nová Ves', FALSE, 'Zdeno Kuchár', 'Zdeno Kuchár', '0905/430834', 'kuchar.zdeno@gmail.com', 'Aktívny'),
('JK SLÁVIA SPU Nitra', 'Československej armády', '94976', '1', 'Z', 'Nitra', FALSE, 'Ľubomír Urban', 'Prof.Ing. Marko Halo, PhD.', '0905/521528', 'marko.halo@uniag.sk', 'Aktívny'),
('JK SLOVAN HÁJE Bratislava', 'Starohájska', '85104', '31', 'B', 'Bratislava', FALSE, 'JUDr. Diana Lauková', 'JUDr. Diana Lauková', '0903/218222', 'diana.laukova@gmail.com', 'Aktívny'),
('JK SŠ Ivanka pri Dunaji', 'SNP', '90028', '30', 'B', 'Ivanka pri Dunaji', FALSE, 'Lenka Marčeková', 'Ing. Katarína Kubišová', '0917/950353', 'gazalko@gmail.com', 'Aktívny'),
('JK TAMARIS Odorín', 'Teplička', '05201', '', '-', 'Teplička', TRUE, 'Denisa Jasečková', 'Denisa Jasečková', '0905/252604', 'denisa.dulajova@gmail.com', 'Aktívny'),
('JK TAVAROK Mengusovce', 'Mengusovce', '05936', '191', 'V', 'Mengusovce', FALSE, 'Ing. Matúš Holmok', 'Ing. Matúš Holmok', '0903/636242', 'matus.holmok@gmail.com', 'Aktívny'),
('JK TJ SLÁVIA STU Bratislava', 'Májová', '85101', '21', 'B', 'Bratislava', FALSE, 'Ing. Rastislav Noskovič', 'Ing. Lucia Noskovičová', '0903/744477', 'tjslaviastu@gmail.com', 'Aktívny'),
('PH SPORTHORSES Dunajská Lužná', 'Jánošíkovská', '90042', '3006', 'B', 'Dunajská Lužná', FALSE, 'Mgr. Petra Havlovičová', 'Mgr. Petra Havlovičová', '0905/730967', 'petra.havlovicova@gmail.com', 'Aktívny'),
('SPOLOK PRIATEĽOV KONÍ Trnava', 'Modranská', '91701', '2', 'Z', 'Trnava', TRUE, 'MVDr. Štefan Ambruš', 'MVDr. Štefan Ambruš', '0905/260589', 'mvdr.stefanambrus@gmail.com', 'Aktívny'),
('TJ ŽIŽKA Bratislava', 'Starý Háj', '85104', '2047', 'B', 'Bratislava', FALSE, 'Marián Štangel', 'Gabriela Rošková', '0905/544715', 'marianstangel1970@gmail.com', 'Aktívny'),
('TJ ŽREBČÍN Motešice', 'Slivnická', '91326', '87', 'Z', 'Motešice', FALSE, 'Doc. PhDr. Dana Petranová, PhD.', 'Doc. PhDr. Dana Petranová, PhD.', '0903/546201', 'furioso@furioso.sk', 'Aktívny'),
('VIDA Bratislava', 'Topoľčianska', '85105', '3', 'B', 'Bratislava', TRUE, 'Vojtech Vida', 'Vojtech Vida', '0905/599234', 'aris5@zoznam.sk', 'Aktívny'),
('VOLTILAND Košice', 'Opiná', '04447', '39', 'V', 'Opiná', TRUE, 'Martin Necela', 'Mgr. Slavomíra Necelová', '0903/167744', 'necelova@gmail.com', 'Aktívny'),
('WAVO HORSES Slovenská Ľupča', 'Za Pílou', '97613', '1', 'S', 'Slovenská Ľupča', TRUE, 'Ing. Daniel Smorádek', 'Ing. Lucia Kohútová', '0915/808636', 'kohutova.lucia@gmail.com', 'Aktívny')
ON CONFLICT DO NOTHING;

-- AKTÍVNI STAVITELIA PARKÚROV (6)
INSERT INTO sjf_persons (first_name, surname, club_name, region, sjf_license_status, course_builder_license) VALUES
('Radka', 'HERMÉLY', 'GREENFIELD SPORT HORSES Hôrka', 'V', 'Aktívny', 'SS2'),
('Zdenek', 'KUCHÁR', 'JK SLÁVIA Spišská Nová Ves', 'V', 'Aktívny', 'SS2'),
('Maroš', 'KUCHÁR', 'JK SLÁVIA Spišská Nová Ves', 'V', 'Aktívny', 'SS2'),
('Zdeno', 'MALÍK', 'TJ ŽREBČÍN Motešice', 'Z', 'Aktívny', 'SS2, SC2'),
('Ľubomír', 'PAUČO', 'JK MASARYKOV DVOR Vígľaš - Pstruša', 'S', 'Aktívny', 'SS4, SC3'),
('Ján', 'SKATULLA', 'JK ALEXANDRIA Hviezdoslavov', 'Z', 'Aktívny', 'SS4')
ON CONFLICT DO NOTHING;

-- AKTÍVNI ROZHODCOVIA (41)
INSERT INTO sjf_persons (first_name, surname, club_name, region, sjf_license_status, judge_license) VALUES
('Diana', 'ANTALÍKOVÁ', 'JK SŠ Ivanka pri Dunaji', 'B', 'Aktívny', 'RV2'),
('Zuzana', 'BAČIAK MASARYKOVÁ', 'JK SŠ Ivanka pri Dunaji', 'B', 'Aktívny', 'FRV3'),
('Dušana', 'BALOGHOVÁ', 'SPOLOK PRIATEĽOV KONÍ Trnava', 'Z', 'Aktívny', 'PRV2, RPV2'),
('Alica', 'GBÚROVÁ', 'JK LIMIT Bratislava', 'B', 'Aktívny', 'RD2, RC2'),
('Jozef', 'HALGOŠ', 'JK TJ SLÁVIA STU Bratislava', 'B', 'Aktívny', 'RS4'),
('Petra', 'HUBAČOVÁ', 'JK NAPOLI Bratislava', 'B', 'Aktívny', 'RE2'),
('Nadežda', 'IVANIČOVÁ', 'JK ALEXANDRIA Hviezdoslavov', 'Z', 'Aktívny', 'RD4'),
('Jana', 'JANUSCHKEOVÁ', 'JK LIMIT Bratislava', 'B', 'Aktívny', 'RC1'),
('Mária', 'KORENKOVÁ LUDVIGOVÁ', 'JK SLÁVIA Spišská Nová Ves', 'V', 'Aktívny', 'RS2'),
('Pavla', 'KRAUSPE', 'JK SŠ Ivanka pri Dunaji', 'B', 'Aktívny', 'FRV4'),
('Kinga', 'KRESANOVÁ', 'AL ASIL Liptovský Mikuláš', 'S', 'Aktívny', 'RE2'),
('Lucia', 'KRIVOSUDSKÁ', 'JK NAPOLI Bratislava', 'B', 'Aktívny', 'RD2'),
('Ján', 'KUCHÁR', 'JK SLÁVIA Spišská Nová Ves', 'V', 'Aktívny', 'RS4'),
('Ivana', 'KUCHÁROVÁ', 'JK SLÁVIA Spišská Nová Ves', 'V', 'Aktívny', 'RS2'),
('Jana', 'LAMOŠOVÁ', 'EQUIPOINT HREUS Žilina', 'S', 'Aktívny', 'RS2'),
('Laura', 'LENČÉŠOVÁ', 'FARAO Trnovec nad Váhom', 'Z', 'Aktívny', 'RV2, RPV2'),
('Vladimíra', 'LENČÉŠOVÁ', 'FARAO Trnovec nad Váhom', 'Z', 'Aktívny', 'RV4, RPV4'),
('Ľubica', 'LUKÁČOVÁ', 'JK FREESTYLE Poprad', 'V', 'Aktívny', 'RV4, RPV4'),
('Slavomír', 'MAGÁL', 'TJ ŽREBČÍN Motešice', 'Z', 'Aktívny', 'RS2, RD2'),
('Zdeno', 'MALÍK', 'TJ ŽREBČÍN Motešice', 'Z', 'Aktívny', 'RS2, RC4'),
('Zuzana', 'MÁNIKOVÁ', 'JK EQUINOX Modrová', 'Z', 'Aktívny', 'RC2'),
('Mária', 'MARTINKOVIČOVÁ', 'SPOLOK PRIATEĽOV KONÍ Trnava', 'Z', 'Aktívny', 'RS2'),
('Katarína', 'MARTINKOVIČOVÁ', 'SPOLOK PRIATEĽOV KONÍ Trnava', 'Z', 'Aktívny', 'RS1'),
('Petra', 'MASÁCOVÁ', 'JK SŠ Ivanka pri Dunaji', 'B', 'Aktívny', 'RV4'),
('Jana', 'MEDOVÁ', 'TJ ŽIŽKA Bratislava', 'B', 'Aktívny', 'RD2, RC2'),
('Peter', 'MIKULÁŠIK', 'HORSE AREA Vysoké Tatry', 'V', 'Aktívny', 'RS4, RC4, RA4'),
('Charlotte', 'MLYNČEKOVÁ', 'AL ASIL Liptovský Mikuláš', 'S', 'Aktívny', 'RE2'),
('Ádám', 'PATÓCS', 'TJ ŽREBČÍN Motešice', 'Z', 'Aktívny', 'RD2'),
('Ľubomír', 'PAUČO', 'JK MASARYKOV DVOR Vígľaš - Pstruša', 'S', 'Aktívny', 'RS4, RD2, RC2'),
('Jozef', 'PAULOVIČ', 'JK MASARYKOV DVOR Vígľaš - Pstruša', 'S', 'Aktívny', 'RS4'),
('Milada', 'PETRUŠKOVÁ', 'JK EQUIDA Prievidza', 'Z', 'Aktívny', 'RD2'),
('Silvia', 'POLÁKOVÁ', 'JK SŠ Ivanka pri Dunaji', 'B', 'Aktívny', 'RD4, RA2'),
('Ján', 'SKATULLA', 'JK ALEXANDRIA Hviezdoslavov', 'Z', 'Aktívny', 'RS2'),
('Jarmila', 'SKATULLOVÁ', 'JK ALEXANDRIA Hviezdoslavov', 'Z', 'Aktívny', 'RS2'),
('Alexandra', 'SKATULLOVÁ', 'JK ALEXANDRIA Hviezdoslavov', 'Z', 'Aktívny', 'RS2'),
('Viktória', 'SOTÁKOVÁ', 'JK ENIMO Slatinské Lazy', 'B', 'Aktívny', 'RS2, RD1, RC2'),
('Martina', 'SÝKOROVÁ', 'FARAO Trnovec nad Váhom', 'Z', 'Aktívny', 'RV4, RPV4'),
('Martina', 'VARGOVÁ', 'FARAO Trnovec nad Váhom', 'Z', 'Aktívny', 'RV4, RPV4'),
('Iľja', 'VIETOR', 'JK SŠ Ivanka pri Dunaji', 'B', 'Aktívny', 'FRD3'),
('Martina', 'VÝBOHOVÁ', 'JK ENIMO Slatinské Lazy', 'B', 'Aktívny', 'RS2, RD2, RC2'),
('Pavol', 'ZAGATA', 'JK SŠ Ivanka pri Dunaji', 'B', 'Aktívny', 'RPV2')
ON CONFLICT DO NOTHING;

-- Log importu
INSERT INTO sjf_sync_log (sync_type, records_total, records_added, notes) VALUES
('initial', 97, 97, 'Iniciálny import - 50 klubov, 6 staviteľov, 41 rozhodcov');

-- =====================================================
-- TABUĽKA: NASTAVENIA (SETTINGS)
-- Konfigurácia webu a systému
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Úvodné nastavenia
INSERT INTO settings (key, value, category) VALUES
('site_name', 'Jazdecký klub Zelená míľa Jaslovské Bohunice', 'general'),
('site_description', 'Jazdecký klub so zameraním na systematický tréning jazdcov a športových koní', 'general'),
('contact_email', 'apilera@apilera.com', 'contact'),
('contact_phone', '+421905523022', 'contact'),
('contact_address', 'Sídlo: Nová ulica 297/41, 919 30 Jaslovské Bohunice\nPrevádzka: Areál PD, Hlavná Jaslovce 124/127, 919 30 Jaslovské Bohunice', 'contact'),
('google_maps_embed', '<iframe src="https://maps.google.com/maps?q=Jazdecký+klub+Zelená+míľa+Jaslovské+Bohunice&output=embed" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>', 'contact'),
('social_facebook', 'https://www.facebook.com/JKZelenaMila', 'social'),
('social_instagram', '', 'social'),
('social_youtube', '', 'social')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
