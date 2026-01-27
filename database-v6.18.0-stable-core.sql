-- =====================================================
-- JKZM v6.18.0 - STABLE CORE (MVP)
-- Jadrové tabuľky pre správu stajne + public web feed
-- =====================================================

-- =====================================================
-- 1) HORSES - rozšírená štruktúra (ak neexistuje)
-- =====================================================
-- Tabuľka horses už existuje, pridáme iba chýbajúce stĺpce
ALTER TABLE horses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================
-- 2) RIDERS - rozšírená štruktúra
-- =====================================================
-- Tabuľka riders už existuje, pridáme chýbajúce stĺpce
ALTER TABLE riders ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================
-- 3) TRAININGS_V2 - nová štruktúra pre tréningy
-- =====================================================
CREATE TABLE IF NOT EXISTS trainings_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_date DATE NOT NULL,
    start_time TIME NULL,
    duration_min INT DEFAULT 60,
    horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    trainer_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    discipline TEXT NULL CHECK (discipline IN ('jumping', 'dressage', 'hacking', 'groundwork', 'other')),
    intensity TEXT NULL CHECK (intensity IN ('low', 'medium', 'high')),
    goals TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainings_v2_date ON trainings_v2(training_date);
CREATE INDEX IF NOT EXISTS idx_trainings_v2_horse ON trainings_v2(horse_id);
CREATE INDEX IF NOT EXISTS idx_trainings_v2_rider ON trainings_v2(rider_id);

-- =====================================================
-- 4) HEALTH_EVENTS - zdravotné udalosti
-- =====================================================
CREATE TABLE IF NOT EXISTS health_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL,
    horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('vaccination', 'deworming', 'dentist', 'farrier', 'vet', 'physio', 'other')),
    title TEXT NOT NULL,
    details TEXT NULL,
    next_due_date DATE NULL,
    document_url TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_events_horse ON health_events(horse_id);
CREATE INDEX IF NOT EXISTS idx_health_events_next_due ON health_events(next_due_date);
CREATE INDEX IF NOT EXISTS idx_health_events_date ON health_events(event_date);

-- =====================================================
-- 5) FEED_LOGS - jednoduché kŕmenie
-- =====================================================
CREATE TABLE IF NOT EXISTS feed_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_date DATE NOT NULL,
    horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    feed_type TEXT NOT NULL,
    amount TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_logs_horse ON feed_logs(horse_id);
CREATE INDEX IF NOT EXISTS idx_feed_logs_date ON feed_logs(log_date);

-- =====================================================
-- 6) PUBLIC_POSTS - verejné príspevky pre web
-- =====================================================
CREATE TABLE IF NOT EXISTS public_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    published_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT NULL,
    body TEXT NULL,
    cover_url TEXT NULL,
    category TEXT DEFAULT 'news',
    is_published BOOLEAN DEFAULT true,
    author_name TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_posts_slug ON public_posts(slug);
CREATE INDEX IF NOT EXISTS idx_public_posts_published ON public_posts(is_published, published_at DESC);

-- =====================================================
-- 7) RLS POLICIES
-- =====================================================

-- Trainings_v2
ALTER TABLE trainings_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trainings_v2_select ON trainings_v2;
CREATE POLICY trainings_v2_select ON trainings_v2 FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS trainings_v2_insert ON trainings_v2;
CREATE POLICY trainings_v2_insert ON trainings_v2 FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS trainings_v2_update ON trainings_v2;
CREATE POLICY trainings_v2_update ON trainings_v2 FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS trainings_v2_delete ON trainings_v2;
CREATE POLICY trainings_v2_delete ON trainings_v2 FOR DELETE TO authenticated USING (true);

-- Health_events
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS health_events_select ON health_events;
CREATE POLICY health_events_select ON health_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS health_events_insert ON health_events;
CREATE POLICY health_events_insert ON health_events FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS health_events_update ON health_events;
CREATE POLICY health_events_update ON health_events FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS health_events_delete ON health_events;
CREATE POLICY health_events_delete ON health_events FOR DELETE TO authenticated USING (true);

-- Feed_logs
ALTER TABLE feed_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feed_logs_select ON feed_logs;
CREATE POLICY feed_logs_select ON feed_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS feed_logs_insert ON feed_logs;
CREATE POLICY feed_logs_insert ON feed_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS feed_logs_update ON feed_logs;
CREATE POLICY feed_logs_update ON feed_logs FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS feed_logs_delete ON feed_logs;
CREATE POLICY feed_logs_delete ON feed_logs FOR DELETE TO authenticated USING (true);

-- Public_posts - admin only pre write, public read cez API
ALTER TABLE public_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_posts_select ON public_posts;
CREATE POLICY public_posts_select ON public_posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS public_posts_insert ON public_posts;
CREATE POLICY public_posts_insert ON public_posts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS public_posts_update ON public_posts;
CREATE POLICY public_posts_update ON public_posts FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS public_posts_delete ON public_posts;
CREATE POLICY public_posts_delete ON public_posts FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 8) TRIGGER pre updated_at na public_posts
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS public_posts_updated_at ON public_posts;
CREATE TRIGGER public_posts_updated_at
    BEFORE UPDATE ON public_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9) SAMPLE DATA (voliteľné)
-- =====================================================
-- INSERT INTO public_posts (title, slug, excerpt, body, category, is_published)
-- VALUES ('Vitajte na webe JK Zelená Míľa', 'vitajte', 'Sme jazdecký klub...', 'Celý text...', 'news', true);

-- =====================================================
-- DONE - v6.18.0 Stable Core
-- =====================================================
