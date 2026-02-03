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
            const { 
                horse_id, date_from, date_to,
                limit = 50, offset = 0 
            } = req.query;

            let query = supabase
                .from('feed_logs')
                .select(`
                    *,
                    horse:horses(id, name)
                `, { count: 'exact' });

            if (horse_id) query = query.eq('horse_id', horse_id);
            if (date_from) query = query.gte('log_date', date_from);
            if (date_to) query = query.lte('log_date', date_to);

            query = query
                .order('log_date', { ascending: false })
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            return res.status(200).json({ data, total: count });
        }

        if (req.method === 'POST') {
            const { ip, user_agent } = getRequestInfo(req);
            
            const { log_date, horse_id, feed_type, amount, notes } = req.body;

            if (!log_date || !horse_id || !feed_type) {
                return res.status(400).json({ 
                    error: 'log_date, horse_id a feed_type sú povinné' 
                });
            }

            const { data, error } = await supabase
                .from('feed_logs')
                .insert([{
                    log_date,
                    horse_id,
                    feed_type,
                    amount: amount || null,
                    notes: notes || null
                }])
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'create',
                entity_type: 'feed-log',
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
        console.error('Feed-logs error:', error);
        return res.status(500).json({ error: error.message });
    }
};
