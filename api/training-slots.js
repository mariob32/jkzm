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
            let { from, to, trainer_id, status, limit = 100, offset = 0 } = req.query;

            // Default: this week
            if (!from) {
                const now = new Date();
                const monday = new Date(now);
                monday.setDate(now.getDate() - now.getDay() + 1);
                from = monday.toISOString().split('T')[0];
            }
            if (!to) {
                const fromDate = new Date(from);
                const sunday = new Date(fromDate);
                sunday.setDate(fromDate.getDate() + 6);
                to = sunday.toISOString().split('T')[0];
            }

            let query = supabase
                .from('training_slots')
                .select(`
                    *,
                    trainer:riders!training_slots_trainer_id_fkey(id, first_name, last_name)
                `, { count: 'exact' })
                .gte('slot_date', from)
                .lte('slot_date', to)
                .order('slot_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (trainer_id) query = query.eq('trainer_id', trainer_id);
            if (status) query = query.eq('status', status);

            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            return res.status(200).json({ data, total: count, from, to });
        }

        if (req.method === 'POST') {
            const { ip, user_agent } = getRequestInfo(req);
            
            const { 
                slot_date, start_time, duration_min, 
                discipline, capacity, trainer_id, status, notes 
            } = req.body;

            if (!slot_date || !start_time) {
                return res.status(400).json({ error: 'slot_date a start_time sú povinné' });
            }

            const insertData = {
                slot_date,
                start_time,
                duration_min: duration_min || 60,
                discipline: discipline || null,
                capacity: capacity || 1,
                trainer_id: trainer_id || null,
                status: status || 'open',
                notes: notes || null
            };

            const { data, error } = await supabase
                .from('training_slots')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'create',
                entity_type: 'training-slot',
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
        console.error('Training-slots error:', error);
        return res.status(500).json({ error: error.message });
    }
};
