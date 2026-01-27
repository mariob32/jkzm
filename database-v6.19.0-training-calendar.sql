-- =====================================================
-- JKZM v6.19.0 - Training Calendar & Reservations
-- =====================================================

-- =====================================================
-- 1) TRAINING SLOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS training_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_min INT NOT NULL DEFAULT 60,
    discipline TEXT NULL,
    capacity INT NOT NULL DEFAULT 1,
    trainer_id UUID NULL REFERENCES riders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_training_slots_date ON training_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_training_slots_trainer ON training_slots(trainer_id);
CREATE INDEX IF NOT EXISTS idx_training_slots_status ON training_slots(status);

-- =====================================================
-- 2) TRAINING BOOKINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS training_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES training_slots(id) ON DELETE CASCADE,
    horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE RESTRICT,
    rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE RESTRICT,
    created_by_actor_id UUID NULL,
    status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled', 'attended', 'no_show')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ NULL,
    cancel_reason TEXT NULL
);

-- Unique constraint - jeden horse+rider na slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_bookings_unique 
    ON training_bookings(slot_id, horse_id, rider_id) 
    WHERE status != 'cancelled';

-- Indexy
CREATE INDEX IF NOT EXISTS idx_training_bookings_slot ON training_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_training_bookings_horse ON training_bookings(horse_id);
CREATE INDEX IF NOT EXISTS idx_training_bookings_rider ON training_bookings(rider_id);
CREATE INDEX IF NOT EXISTS idx_training_bookings_status ON training_bookings(status);

-- =====================================================
-- 3) RLS POLICIES
-- =====================================================
ALTER TABLE training_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_bookings ENABLE ROW LEVEL SECURITY;

-- Training slots policies
DROP POLICY IF EXISTS "training_slots_select" ON training_slots;
CREATE POLICY "training_slots_select" ON training_slots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "training_slots_insert" ON training_slots;
CREATE POLICY "training_slots_insert" ON training_slots FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "training_slots_update" ON training_slots;
CREATE POLICY "training_slots_update" ON training_slots FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "training_slots_delete" ON training_slots;
CREATE POLICY "training_slots_delete" ON training_slots FOR DELETE TO authenticated USING (true);

-- Training bookings policies
DROP POLICY IF EXISTS "training_bookings_select" ON training_bookings;
CREATE POLICY "training_bookings_select" ON training_bookings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "training_bookings_insert" ON training_bookings;
CREATE POLICY "training_bookings_insert" ON training_bookings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "training_bookings_update" ON training_bookings;
CREATE POLICY "training_bookings_update" ON training_bookings FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "training_bookings_delete" ON training_bookings;
CREATE POLICY "training_bookings_delete" ON training_bookings FOR DELETE TO authenticated USING (true);

-- =====================================================
-- DONE - v6.19.0 Training Calendar
-- =====================================================
