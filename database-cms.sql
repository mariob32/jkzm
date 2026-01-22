-- =====================================================
-- JKZM CMS ROZŠÍRENIE
-- Galéria, Články, Stránky, Väzby
-- =====================================================

-- =====================================================
-- GALÉRIA
-- =====================================================

-- Albumy
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    cover_image TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Fotky
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    photographer VARCHAR(255),
    taken_at DATE,
    sort_order INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    -- Väzby
    horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ČLÁNKY A NOVINKY
-- =====================================================

-- Kategórie článkov
CREATE TABLE IF NOT EXISTS article_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Články
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    excerpt TEXT,
    content TEXT,
    cover_image TEXT,
    category_id UUID REFERENCES article_categories(id) ON DELETE SET NULL,
    author VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    is_featured BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    views INTEGER DEFAULT 0,
    -- Väzby
    horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- STATICKÉ STRÁNKY
-- =====================================================

CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    template VARCHAR(50) DEFAULT 'default', -- default, contact, about, services
    is_published BOOLEAN DEFAULT FALSE,
    show_in_menu BOOLEAN DEFAULT FALSE,
    menu_order INTEGER DEFAULT 0,
    parent_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DOKUMENTY NA STIAHNUTIE
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size INTEGER,
    category VARCHAR(100), -- prihlášky, pravidlá, výsledky, iné
    is_public BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    -- Väzby
    competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PARTNERI A SPONZORI
-- =====================================================

CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    website VARCHAR(255),
    description TEXT,
    partner_type VARCHAR(50) DEFAULT 'partner', -- hlavny_sponzor, sponzor, partner, mediálny_partner
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- VÄZBY MEDZI ENTITAMI
-- =====================================================

-- Kôň - Jazdec (história)
CREATE TABLE IF NOT EXISTS horse_rider_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID REFERENCES horses(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES riders(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    relationship_type VARCHAR(50) DEFAULT 'jazdec', -- jazdec, majiteľ, tréner
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Výsledky súťaží
CREATE TABLE IF NOT EXISTS competition_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    discipline VARCHAR(100),
    category VARCHAR(100),
    placement INTEGER,
    score DECIMAL(10,2),
    time_seconds DECIMAL(10,3),
    penalties INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tréningy - účastníci
CREATE TABLE IF NOT EXISTS training_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID REFERENCES trainings(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES riders(id) ON DELETE CASCADE,
    horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    attended BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(training_id, rider_id)
);

-- =====================================================
-- NASTAVENIA WEBU
-- =====================================================

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(20) DEFAULT 'text', -- text, number, boolean, json, image
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Základné nastavenia
INSERT INTO settings (key, value, type, category, description) VALUES
('site_name', 'Jazdecký klub', 'text', 'general', 'Názov klubu'),
('site_description', 'Profesionálny jazdecký klub', 'text', 'general', 'Popis klubu'),
('site_logo', '', 'image', 'general', 'Logo klubu'),
('contact_email', '', 'text', 'contact', 'Kontaktný email'),
('contact_phone', '', 'text', 'contact', 'Kontaktný telefón'),
('contact_address', '', 'text', 'contact', 'Adresa'),
('social_facebook', '', 'text', 'social', 'Facebook URL'),
('social_instagram', '', 'text', 'social', 'Instagram URL'),
('social_youtube', '', 'text', 'social', 'YouTube URL'),
('google_maps_embed', '', 'text', 'contact', 'Google Maps embed kód'),
('opening_hours', '{}', 'json', 'general', 'Otváracie hodiny')
ON CONFLICT (key) DO NOTHING;

-- Základné kategórie článkov
INSERT INTO article_categories (name, slug, color, sort_order) VALUES
('Novinky', 'novinky', '#3b82f6', 1),
('Súťaže', 'sutaze', '#10b981', 2),
('Tréningy', 'treningy', '#f59e0b', 3),
('Kone', 'kone', '#8b5cf6', 4),
('Klubový život', 'klubovy-zivot', '#ec4899', 5)
ON CONFLICT (slug) DO NOTHING;

-- Základné stránky
INSERT INTO pages (title, slug, template, is_published, show_in_menu, menu_order) VALUES
('O nás', 'o-nas', 'about', TRUE, TRUE, 1),
('Služby', 'sluzby', 'services', TRUE, TRUE, 2),
('Kontakt', 'kontakt', 'contact', TRUE, TRUE, 3),
('Galéria', 'galeria', 'default', TRUE, TRUE, 4),
('Cenník', 'cennik', 'default', TRUE, TRUE, 5)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- INDEXY
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_horse ON photos(horse_id);
CREATE INDEX IF NOT EXISTS idx_photos_rider ON photos(rider_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_competition_results_competition ON competition_results(competition_id);
CREATE INDEX IF NOT EXISTS idx_horse_rider_history_horse ON horse_rider_history(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_rider_history_rider ON horse_rider_history(rider_id);

-- =====================================================
-- VIEWS
-- =====================================================

-- Publikované články
CREATE OR REPLACE VIEW v_published_articles AS
SELECT a.*, c.name as category_name, c.color as category_color
FROM articles a
LEFT JOIN article_categories c ON a.category_id = c.id
WHERE a.status = 'published'
ORDER BY a.is_pinned DESC, a.published_at DESC;

-- Verejné albumy s počtom fotiek
CREATE OR REPLACE VIEW v_public_albums AS
SELECT a.*, COUNT(p.id) as photo_count
FROM albums a
LEFT JOIN photos p ON a.id = p.album_id AND p.is_public = TRUE
WHERE a.is_public = TRUE
GROUP BY a.id
ORDER BY a.sort_order, a.created_at DESC;

-- Menu stránky
CREATE OR REPLACE VIEW v_menu_pages AS
SELECT id, title, slug, parent_id, menu_order
FROM pages
WHERE is_published = TRUE AND show_in_menu = TRUE
ORDER BY menu_order;


-- Služby
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT '🏇',
    badge_text VARCHAR(50),
    badge_type VARCHAR(20), -- 'full', 'soon', 'new', 'sale'
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vložiť základné služby
INSERT INTO services (title, description, icon, badge_text, badge_type, sort_order) VALUES
('Jazdecké tréningy', 'Individuálne aj skupinové tréningy pre začiatočníkov aj pokročilých jazdcov.', '🏇', NULL, NULL, 1),
('Ustajnenie', 'Kvalitné ustajnenie v moderných boxoch s celodennou starostlivosťou.', '🏠', 'Obsadené', 'full', 2),
('Súťaže', 'Organizujeme klubové aj regionálne súťaže všetkých úrovní.', '🏆', NULL, NULL, 3),
('Detské tábory', 'Letné jazdecké tábory pre deti s bohatým programom.', '👶', 'Pripravujeme', 'soon', 4);
