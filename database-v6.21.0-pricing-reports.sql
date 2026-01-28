-- =====================================================
-- JKZM v6.21.0 - Pricing Rules + Reports MVP
-- =====================================================

-- 1) PRICING_RULES TABLE
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 100,
    discipline TEXT NULL,
    min_duration_min INT NULL,
    max_duration_min INT NULL,
    rider_id UUID NULL,
    horse_id UUID NULL,
    base_amount_cents INT NOT NULL CHECK (base_amount_cents >= 0),
    per_minute_cents INT NOT NULL DEFAULT 0 CHECK (per_minute_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) PRICING_RULES INDEXES
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_priority ON pricing_rules(priority);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_discipline ON pricing_rules(discipline);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_rider ON pricing_rules(rider_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_horse ON pricing_rules(horse_id);

-- 3) PRICING_RULES RLS
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_rules_select" ON pricing_rules;
CREATE POLICY "pricing_rules_select" ON pricing_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pricing_rules_insert" ON pricing_rules;
CREATE POLICY "pricing_rules_insert" ON pricing_rules FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pricing_rules_update" ON pricing_rules;
CREATE POLICY "pricing_rules_update" ON pricing_rules FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "pricing_rules_delete" ON pricing_rules;
CREATE POLICY "pricing_rules_delete" ON pricing_rules FOR DELETE TO authenticated USING (true);

-- 4) BILLING_CHARGES - add pricing columns
ALTER TABLE billing_charges ADD COLUMN IF NOT EXISTS pricing_rule_id UUID NULL;
ALTER TABLE billing_charges ADD COLUMN IF NOT EXISTS computed_details JSONB NULL;

CREATE INDEX IF NOT EXISTS idx_billing_charges_pricing_rule ON billing_charges(pricing_rule_id);

-- 5) UPDATED_AT TRIGGER for pricing_rules
CREATE OR REPLACE FUNCTION update_pricing_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER trigger_pricing_rules_updated_at
    BEFORE UPDATE ON pricing_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_rules_updated_at();

-- 6) DEFAULT PRICING RULE SEED
INSERT INTO pricing_rules (name, is_active, priority, base_amount_cents, per_minute_cents, currency)
SELECT 'Default training 60min', true, 1000, 2000, 0, 'EUR'
WHERE NOT EXISTS (SELECT 1 FROM pricing_rules WHERE name = 'Default training 60min');

-- =====================================================
-- DONE - v6.21.0 Pricing Rules + Reports MVP
-- =====================================================
