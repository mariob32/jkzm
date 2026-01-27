-- =====================================================
-- JKZM v6.20.0 - Billing MVP
-- =====================================================

-- 1) BILLING_CHARGES tabuľka
CREATE TABLE IF NOT EXISTS billing_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID NULL,
    booking_id UUID NULL,
    rider_id UUID NULL,
    horse_id UUID NULL,
    amount_cents INT NOT NULL CHECK (amount_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'void')),
    due_date DATE NULL,
    paid_at TIMESTAMPTZ NULL,
    paid_method TEXT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Indexy
CREATE INDEX IF NOT EXISTS idx_billing_charges_status ON billing_charges(status);
CREATE INDEX IF NOT EXISTS idx_billing_charges_rider ON billing_charges(rider_id);
CREATE INDEX IF NOT EXISTS idx_billing_charges_horse ON billing_charges(horse_id);
CREATE INDEX IF NOT EXISTS idx_billing_charges_training ON billing_charges(training_id);
CREATE INDEX IF NOT EXISTS idx_billing_charges_booking ON billing_charges(booking_id);

-- 3) Unique indexy pre idempotentnosť
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_charges_training_unique 
    ON billing_charges(training_id) 
    WHERE training_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_charges_booking_unique 
    ON billing_charges(booking_id) 
    WHERE booking_id IS NOT NULL;

-- 4) Updated_at trigger
CREATE OR REPLACE FUNCTION update_billing_charges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS billing_charges_updated_at ON billing_charges;
CREATE TRIGGER billing_charges_updated_at
    BEFORE UPDATE ON billing_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_charges_updated_at();

-- 5) Doplň stĺpce do trainings ak chýbajú
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS billing_status TEXT NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS billing_charge_id UUID NULL;

-- 6) RLS
ALTER TABLE billing_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_charges_select" ON billing_charges;
CREATE POLICY "billing_charges_select" ON billing_charges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "billing_charges_insert" ON billing_charges;
CREATE POLICY "billing_charges_insert" ON billing_charges FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "billing_charges_update" ON billing_charges;
CREATE POLICY "billing_charges_update" ON billing_charges FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "billing_charges_delete" ON billing_charges;
CREATE POLICY "billing_charges_delete" ON billing_charges FOR DELETE TO authenticated USING (true);

-- =====================================================
-- DONE - v6.20.0 Billing MVP
-- =====================================================
