const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logAudit, getRequestInfo } = require('./utils/audit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const { ip, user_agent } = getRequestInfo(req);

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('pricing_rules')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Pravidlo nenájdené' });

            // Fetch rider/horse if present
            let rider = null, horse = null;
            if (data.rider_id) {
                const { data: r } = await supabase.from('riders').select('id, first_name, last_name').eq('id', data.rider_id).single();
                rider = r;
            }
            if (data.horse_id) {
                const { data: h } = await supabase.from('horses').select('id, name').eq('id', data.horse_id).single();
                horse = h;
            }

            return res.status(200).json({ ...data, rider, horse });
        }

        if (req.method === 'PATCH') {
            // Get before data
            const { data: before } = await supabase
                .from('pricing_rules')
                .select('*')
                .eq('id', id)
                .single();

            if (!before) return res.status(404).json({ error: 'Pravidlo nenájdené' });

            const updates = {};
            const allowedFields = [
                'name', 'is_active', 'priority', 'discipline',
                'min_duration_min', 'max_duration_min',
                'rider_id', 'horse_id',
                'base_amount_cents', 'per_minute_cents', 'currency'
            ];

            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            // Validate amounts
            if (updates.base_amount_cents !== undefined && updates.base_amount_cents < 0) {
                return res.status(400).json({ error: 'base_amount_cents musí byť >= 0' });
            }
            if (updates.per_minute_cents !== undefined && updates.per_minute_cents < 0) {
                return res.status(400).json({ error: 'per_minute_cents musí byť >= 0' });
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'Žiadne polia na aktualizáciu' });
            }

            const { data, error } = await supabase
                .from('pricing_rules')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'update',
                entity_type: 'pricing-rule',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: data
            });

            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            // Get rule first
            const { data: rule } = await supabase
                .from('pricing_rules')
                .select('*')
                .eq('id', id)
                .single();

            if (!rule) return res.status(404).json({ error: 'Pravidlo nenájdené' });

            // Check if used by any charges
            const { count } = await supabase
                .from('billing_charges')
                .select('*', { count: 'exact', head: true })
                .eq('pricing_rule_id', id);

            if (count && count > 0) {
                return res.status(409).json({ 
                    error: 'Pravidlo sa používa v existujúcich položkách', 
                    charges_count: count 
                });
            }

            const { error } = await supabase
                .from('pricing_rules')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logAudit(supabase, {
                action: 'delete',
                entity_type: 'pricing-rule',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: rule,
                after_data: null
            });

            return res.status(200).json({ message: 'Pravidlo zmazané' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Pricing-rules-id error:', error);
        return res.status(500).json({ error: error.message });
    }
};
