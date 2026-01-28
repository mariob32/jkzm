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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (req.method === 'GET') {
            const { active_only = 'true', limit = 100, offset = 0 } = req.query;

            let query = supabase
                .from('pricing_rules')
                .select('*', { count: 'exact' })
                .order('priority', { ascending: true })
                .order('created_at', { ascending: false });

            if (active_only === 'true') {
                query = query.eq('is_active', true);
            }

            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            // Fetch related rider/horse names
            const riderIds = [...new Set(data.filter(r => r.rider_id).map(r => r.rider_id))];
            const horseIds = [...new Set(data.filter(r => r.horse_id).map(r => r.horse_id))];

            let ridersMap = {}, horsesMap = {};

            if (riderIds.length > 0) {
                const { data: riders } = await supabase.from('riders').select('id, first_name, last_name').in('id', riderIds);
                if (riders) riders.forEach(r => ridersMap[r.id] = r);
            }
            if (horseIds.length > 0) {
                const { data: horses } = await supabase.from('horses').select('id, name').in('id', horseIds);
                if (horses) horses.forEach(h => horsesMap[h.id] = h);
            }

            const enrichedData = data.map(r => ({
                ...r,
                rider: ridersMap[r.rider_id] || null,
                horse: horsesMap[r.horse_id] || null
            }));

            return res.status(200).json({ data: enrichedData, total: count });
        }

        if (req.method === 'POST') {
            const { ip, user_agent } = getRequestInfo(req);

            const {
                name,
                is_active = true,
                priority = 100,
                discipline,
                min_duration_min,
                max_duration_min,
                rider_id,
                horse_id,
                base_amount_cents,
                per_minute_cents = 0,
                currency = 'EUR'
            } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'name je povinný' });
            }

            if (base_amount_cents === undefined || base_amount_cents < 0) {
                return res.status(400).json({ error: 'base_amount_cents je povinný a musí byť >= 0' });
            }

            const insertData = {
                name,
                is_active,
                priority: parseInt(priority),
                discipline: discipline || null,
                min_duration_min: min_duration_min ? parseInt(min_duration_min) : null,
                max_duration_min: max_duration_min ? parseInt(max_duration_min) : null,
                rider_id: rider_id || null,
                horse_id: horse_id || null,
                base_amount_cents: parseInt(base_amount_cents),
                per_minute_cents: parseInt(per_minute_cents),
                currency
            };

            const { data, error } = await supabase
                .from('pricing_rules')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'create',
                entity_type: 'pricing-rule',
                entity_id: data.id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: data
            });

            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Pricing-rules error:', error);
        return res.status(500).json({ error: error.message });
    }
};
