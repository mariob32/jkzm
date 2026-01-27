-- =====================================================
-- JKZM v6.19.1 - Training Link Fix
-- =====================================================

-- 1) TRAINING_BOOKINGS - pridaj training_id a marked_at
ALTER TABLE training_bookings ADD COLUMN IF NOT EXISTS training_id UUID NULL;
ALTER TABLE training_bookings ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ NULL;

-- Index pre training_id
CREATE INDEX IF NOT EXISTS idx_training_bookings_training_id ON training_bookings(training_id);

-- 2) TRAININGS - zabezpeč kompatibilitu stĺpcov
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS horse_id UUID NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS rider_id UUID NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS trainer_id UUID NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS discipline TEXT NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS intensity TEXT NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS goals TEXT NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS duration_min INT NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS training_date DATE NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS source_booking_id UUID NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS status TEXT NULL;

-- Unique index pre source_booking_id (aby sa attended neduplikoval)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainings_source_booking_unique 
    ON trainings(source_booking_id) 
    WHERE source_booking_id IS NOT NULL;

-- FK constraint pre training_bookings.training_id (ak neexistuje)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'training_bookings_training_id_fkey'
    ) THEN
        ALTER TABLE training_bookings 
            ADD CONSTRAINT training_bookings_training_id_fkey 
            FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Sync training_date s date pre existujúce záznamy
UPDATE trainings SET training_date = date WHERE training_date IS NULL AND date IS NOT NULL;

-- =====================================================
-- DONE - v6.19.1 Training Link Fix
-- =====================================================
