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
            let { 
                date_from, date_to, horse_id, rider_id, trainer_id,
                limit = 50, offset = 0 
            } = req.query;

            // Default: last 7 days if no date filter
            if (!date_from && !date_to) {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                date_from = sevenDaysAgo.toISOString().split('T')[0];
            }

            let query = supabase
                .from('trainings_v2')
                .select(`
                    *,
                    horse:horses(id, name),
                    rider:riders!trainings_v2_rider_id_fkey(id, first_name, last_name),
                    trainer:riders!trainings_v2_trainer_id_fkey(id, first_name, last_name)
                `, { count: 'exact' });

            if (date_from) query = query.gte('training_date', date_from);
            if (date_to) query = query.lte('training_date', date_to);
            if (horse_id) query = query.eq('horse_id', horse_id);
            if (rider_id) query = query.eq('rider_id', rider_id);
            if (trainer_id) query = query.eq('trainer_id', trainer_id);

            query = query
                .order('training_date', { ascending: false })
                .order('start_time', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            return res.status(200).json({ data, total: count });
        }

        if (req.method === 'POST') {
            const { ip, user_agent } = getRequestInfo(req);
            
            const { 
                training_date, start_time, duration_min,
                horse_id, rider_id, trainer_id,
                discipline, intensity, goals, notes 
            } = req.body;

            if (!training_date) {
                return res.status(400).json({ error: 'training_date je povinný' });
            }

            const insertData = {
                training_date,
                start_time: start_time || null,
                duration_min: duration_min || 60,
                horse_id: horse_id || null,
                rider_id: rider_id || null,
                trainer_id: trainer_id || null,
                discipline: discipline || null,
                intensity: intensity || null,
                goals: goals || null,
                notes: notes || null
            };

            const { data, error } = await supabase
                .from('trainings_v2')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'create',
                entity_type: 'training',
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
        console.error('Trainings-v2 error:', error);
        return res.status(500).json({ error: error.message });
    }
};
