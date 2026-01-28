-- =====================================================
-- JKZM v6.21.1 - Billing Hardening
-- =====================================================

-- 1) BILLING_CHARGES - nové stĺpce
ALTER TABLE billing_charges ADD COLUMN IF NOT EXISTS void_reason TEXT NULL;
ALTER TABLE billing_charges ADD COLUMN IF NOT EXISTS reference_code TEXT NULL;
ALTER TABLE billing_charges ADD COLUMN IF NOT EXISTS paid_reference TEXT NULL;

-- 2) Indexy pre rýchle filtrovanie
CREATE INDEX IF NOT EXISTS idx_billing_charges_rider_status ON billing_charges(rider_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_charges_created_at ON billing_charges(created_at);

-- 3) Fix paid_method pre existujúce dáta (normalizácia)
UPDATE billing_charges 
SET paid_method = 'other' 
WHERE paid_method IS NOT NULL 
  AND paid_method NOT IN ('cash', 'card', 'bank', 'other');

-- =====================================================
-- DONE - v6.21.1 Billing Hardening
-- =====================================================
