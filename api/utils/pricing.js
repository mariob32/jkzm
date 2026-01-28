// ===== JKZM Pricing Helper =====
// api/utils/pricing.js

async function computeCharge(supabase, { discipline, duration_min, duration_minutes, rider_id, horse_id, currency = 'EUR' }) {
    // Duration fallback: duration_min > duration_minutes > 60
    const durationMinutes = duration_min || duration_minutes || 60;

    // Build query for matching rules
    let query = supabase
        .from('pricing_rules')
        .select('*')
        .eq('is_active', true)
        .eq('currency', currency)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

    const { data: rules, error } = await query;

    if (error) {
        console.error('Pricing rules query error:', error);
        return {
            amount_cents: 2000, // fallback
            pricing_rule_id: null,
            computed_details: { fallback: true, reason: 'query_error' }
        };
    }

    if (!rules || rules.length === 0) {
        return {
            amount_cents: 2000,
            pricing_rule_id: null,
            computed_details: { fallback: true, reason: 'no_rules' }
        };
    }

    // Find best matching rule
    let bestRule = null;
    let matchedFields = [];

    for (const rule of rules) {
        let matches = true;
        let currentMatches = [];

        // Check discipline
        if (rule.discipline !== null) {
            if (rule.discipline === discipline) {
                currentMatches.push('discipline');
            } else {
                matches = false;
            }
        }

        // Check duration range
        if (matches && rule.min_duration_min !== null) {
            if (durationMinutes >= rule.min_duration_min) {
                currentMatches.push('min_duration');
            } else {
                matches = false;
            }
        }

        if (matches && rule.max_duration_min !== null) {
            if (durationMinutes <= rule.max_duration_min) {
                currentMatches.push('max_duration');
            } else {
                matches = false;
            }
        }

        // Check rider
        if (matches && rule.rider_id !== null) {
            if (rule.rider_id === rider_id) {
                currentMatches.push('rider');
            } else {
                matches = false;
            }
        }

        // Check horse
        if (matches && rule.horse_id !== null) {
            if (rule.horse_id === horse_id) {
                currentMatches.push('horse');
            } else {
                matches = false;
            }
        }

        if (matches) {
            bestRule = rule;
            matchedFields = currentMatches;
            break; // First matching rule by priority
        }
    }

    if (!bestRule) {
        // Use first rule as fallback (should be default)
        bestRule = rules[0];
        matchedFields = ['default'];
    }

    // Calculate amount
    const baseAmount = bestRule.base_amount_cents || 0;
    const perMinuteAmount = (bestRule.per_minute_cents || 0) * durationMinutes;
    const totalAmount = baseAmount + perMinuteAmount;

    return {
        amount_cents: totalAmount,
        pricing_rule_id: bestRule.id,
        computed_details: {
            rule_name: bestRule.name,
            rule_id: bestRule.id,
            base_amount_cents: baseAmount,
            per_minute_cents: bestRule.per_minute_cents || 0,
            duration_min: durationMinutes,
            per_minute_total: perMinuteAmount,
            matched_fields: matchedFields,
            discipline: discipline || null,
            currency: bestRule.currency
        }
    };
}

module.exports = { computeCharge };
