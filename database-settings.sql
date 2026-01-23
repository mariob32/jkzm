-- =====================================================
-- JAZDECKÝ KLUB ZELENÁ MÍĽA - NASTAVENIA WEBU
-- Spusti tento SQL v Supabase SQL Editor
-- =====================================================

-- Vytvorenie tabuľky settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Povolenie RLS a prístupu
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy pre čítanie (public)
CREATE POLICY "Allow public read" ON settings FOR SELECT USING (true);

-- Policy pre zápis (authenticated alebo service role)
CREATE POLICY "Allow authenticated write" ON settings FOR ALL USING (true);

-- Úvodné nastavenia
INSERT INTO settings (key, value, category) VALUES
('site_name', 'Jazdecký klub Zelená míľa Jaslovské Bohunice', 'general'),
('site_description', 'Jazdecký klub so zameraním na systematický tréning jazdcov a športových koní', 'general'),
('contact_email', 'apilera@apilera.com', 'contact'),
('contact_phone', '+421905523022', 'contact'),
('contact_address', 'Sídlo: Nová ulica 297/41, 919 30 Jaslovské Bohunice
Prevádzka: Areál PD, Hlavná Jaslovce 124/127, 919 30 Jaslovské Bohunice', 'contact'),
('google_maps_embed', '<iframe src="https://maps.google.com/maps?q=Jazdecký+klub+Zelená+míľa+Jaslovské+Bohunice&output=embed" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>', 'contact'),
('social_facebook', 'https://www.facebook.com/JKZelenaMila', 'social'),
('social_instagram', '', 'social'),
('social_youtube', '', 'social')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    updated_at = CURRENT_TIMESTAMP;

-- Hotovo!
SELECT 'Settings tabuľka vytvorená a naplnená!' as status;
