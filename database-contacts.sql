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
