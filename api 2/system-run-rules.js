const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Neautorizovany' });

    try {
        // Nacitat aktivne pravidla
        const { data: rules, error: rulesError } = await supabase
            .from('notification_rules')
            .select('*')
            .eq('is_active', true);
        
        if (rulesError) throw rulesError;

        const results = { processed: 0, created: 0, skipped: 0, errors: [] };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        for (const rule of rules || []) {
            try {
                results.processed++;
                let entities = [];
                
                // Nacitat entity podla typu
                if (rule.entity_type === 'horses') {
                    const { data } = await supabase
                        .from('horses')
                        .select('id, name, stable_name, passport_number, microchip, sjf_license_valid_until, fei_passport_expiry, insurance_valid_until, status')
                        .eq('status', 'active');
                    entities = data || [];
                } else if (rule.entity_type === 'vaccinations') {
                    const { data } = await supabase
                        .from('vaccinations')
                        .select('id, horse_id, vaccine_type, vaccination_date, next_date, horses(id, name, stable_name)');
                    entities = data || [];
                }

                for (const entity of entities) {
                    const fieldValue = entity[rule.condition_field];
                    let shouldNotify = false;
                    let expiresAt = null;
                    let notificationExpiresAt = null;

                    if (rule.rule_type === 'expiry') {
                        // Expiracia - vytvor upozornenie X dni pred
                        if (fieldValue) {
                            const expiryDate = new Date(fieldValue);
                            const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                            
                            if (daysUntil <= rule.days_before && daysUntil >= -7) {
                                // Upozornenie ak je v rozsahu (days_before az 7 dni po expirácii)
                                shouldNotify = true;
                                expiresAt = fieldValue;
                                // Notifikacia expiruje 7 dni po expirácii entity
                                const expDate = new Date(expiryDate);
                                expDate.setDate(expDate.getDate() + 7);
                                notificationExpiresAt = expDate.toISOString().split('T')[0];
                            }
                        }
                    } else if (rule.rule_type === 'missing') {
                        // Chybajuce - vytvor upozornenie ak je null/prazdne
                        if (!fieldValue || fieldValue === '') {
                            shouldNotify = true;
                            // Missing notifikacie expiruju o 30 dni (prehodnotit)
                            const exp = new Date(today);
                            exp.setDate(exp.getDate() + 30);
                            notificationExpiresAt = exp.toISOString().split('T')[0];
                        }
                    }

                    if (shouldNotify) {
                        const entityId = entity.id;
                        const horseId = rule.entity_type === 'horses' ? entity.id : entity.horse_id;
                        
                        // DEDUP: Skontroluj ci uz existuje aktivna notifikacia pre toto pravidlo + entitu
                        const { data: existing } = await supabase
                            .from('notifications')
                            .select('id')
                            .eq('rule_id', rule.id)
                            .eq('entity_id', entityId)
                            .eq('is_dismissed', false)
                            .or(`expires_at.is.null,expires_at.gte.${todayStr}`)
                            .maybeSingle();

                        if (existing) {
                            results.skipped++;
                            continue;
                        }

                        // Pripravit nazov kona
                        const horseName = entity.stable_name || entity.name || 
                            (entity.horses ? (entity.horses.stable_name || entity.horses.name) : 'Neznamy');
                        
                        // Nahradit placeholdery v template
                        let message = (rule.message_template || '')
                            .replace(/{name}/g, horseName)
                            .replace(/{horse_name}/g, horseName)
                            .replace(/{date}/g, expiresAt || '')
                            .replace(/{vaccine_type}/g, entity.vaccine_type || '');

                        // Vytvorit notifikaciu
                        const { error: insertError } = await supabase
                            .from('notifications')
                            .insert({
                                title: rule.name,
                                message,
                                notification_type: 'system',
                                source: 'rule',
                                rule_id: rule.id,
                                entity_type: rule.entity_type,
                                entity_id: entityId,
                                assigned_horse_id: horseId,
                                severity: rule.severity || 'warning',
                                priority: rule.severity === 'danger' ? 'high' : 'normal',
                                status: 'pending',
                                due_date: expiresAt,
                                expires_at: notificationExpiresAt,
                                is_read: false,
                                is_dismissed: false
                            });

                        if (insertError) {
                            results.errors.push(`${rule.name}: ${insertError.message}`);
                        } else {
                            results.created++;
                        }
                    }
                }
            } catch (ruleError) {
                results.errors.push(`${rule.name}: ${ruleError.message}`);
            }
        }

        return res.status(200).json({
            success: true,
            message: `Spracovanych: ${results.processed} pravidiel, vytvorených: ${results.created}, preskocených: ${results.skipped}`,
            results
        });

    } catch (e) {
        console.error('System run rules error:', e);
        res.status(500).json({ error: e.message });
    }
};
