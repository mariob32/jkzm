const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { data: rules, error: rulesError } = await supabase
            .from('notification_rules')
            .select('*')
            .eq('is_active', true);
        
        if (rulesError) throw rulesError;

        const results = { processed: 0, created: 0, skipped: 0, errors: [] };
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const rule of rules || []) {
            try {
                results.processed++;
                let entities = [];
                
                if (rule.entity_type === 'horses') {
                    const { data } = await supabase.from('horses').select('*').eq('status', 'active');
                    entities = data || [];
                } else if (rule.entity_type === 'vaccinations') {
                    const { data } = await supabase.from('vaccinations').select('*, horses(id, name, stable_name)');
                    entities = data || [];
                } else if (rule.entity_type === 'vet_records') {
                    const { data } = await supabase.from('vet_records').select('*, horses(id, name, stable_name)');
                    entities = data || [];
                } else if (rule.entity_type === 'stable_log') {
                    const { data } = await supabase.from('stable_log').select('*, horses(id, name, stable_name)').eq('event_type', 'quarantine_start');
                    entities = data || [];
                }

                for (const entity of entities) {
                    const fieldValue = entity[rule.condition_field];
                    let shouldNotify = false;
                    let expiresAt = null;

                    if (rule.rule_type === 'expiry') {
                        if (fieldValue) {
                            const expiryDate = new Date(fieldValue);
                            const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                            if (daysUntil <= rule.days_before && daysUntil >= 0) {
                                shouldNotify = true;
                                expiresAt = fieldValue;
                            }
                        }
                    } else if (rule.rule_type === 'missing') {
                        if (!fieldValue || fieldValue === '') {
                            shouldNotify = true;
                        }
                    } else if (rule.rule_type === 'status') {
                        shouldNotify = true;
                    }

                    if (shouldNotify) {
                        const { data: existing } = await supabase
                            .from('notifications')
                            .select('id')
                            .eq('rule_id', rule.id)
                            .eq('entity_type', rule.entity_type)
                            .eq('entity_id', entity.id)
                            .in('status', ['pending', 'active'])
                            .maybeSingle();

                        if (existing) {
                            results.skipped++;
                            continue;
                        }

                        const horseName = entity.name || entity.stable_name || 
                            (entity.horses ? (entity.horses.stable_name || entity.horses.name) : '');
                        
                        let message = (rule.message_template || '')
                            .replace(/{name}/g, horseName)
                            .replace(/{horse_name}/g, horseName)
                            .replace(/{date}/g, expiresAt || '');

                        const priority = rule.severity === 'danger' ? 'high' : (rule.severity === 'warning' ? 'normal' : 'low');

                        const { error: insertError } = await supabase
                            .from('notifications')
                            .insert({
                                notification_type: 'system',
                                title: rule.name,
                                message,
                                priority,
                                status: 'pending',
                                source: 'rule',
                                rule_id: rule.id,
                                entity_type: rule.entity_type,
                                entity_id: entity.id,
                                assigned_horse_id: rule.entity_type === 'horses' ? entity.id : (entity.horse_id || null)
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
            message: `Spracovane: ${results.processed}, vytvorene: ${results.created}, preskocene: ${results.skipped}`,
            results
        });

    } catch (e) {
        console.error('System run rules error:', e);
        res.status(500).json({ error: e.message });
    }
};
