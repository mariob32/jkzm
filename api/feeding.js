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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        if (req.method === 'GET') {
            const { data: schedules, error } = await supabase.from('feeding_schedules')
                .select('*, horses:horse_id (name)')
                .order('feed_time');
            if (error) throw error;

            const result = await Promise.all(schedules.map(async (s) => {
                const { data: items } = await supabase.from('feeding_items').select('*').eq('schedule_id', s.id);
                return { ...s, horse_name: s.horses?.name, items: items || [] };
            }));
            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            const { horse_id, time_of_day, feed_time, items } = req.body;
            if (!horse_id) return res.status(400).json({ error: 'horse_id required' });
            
            const { data: schedule, error } = await supabase.from('feeding_schedules')
                .insert([{ horse_id, time_of_day, feed_time }])
                .select().single();
            if (error) throw error;

            if (items && items.length > 0) {
                const feedItems = items.map(i => ({ schedule_id: schedule.id, feed_type: i.feed_type, amount: i.amount, unit: i.unit }));
                await supabase.from('feeding_items').insert(feedItems);
            }
            return res.status(201).json(schedule);
        }

        if (req.method === 'PUT') {
            const { id, horse_id, time_of_day, feed_time, items } = req.body;
            const { data, error } = await supabase.from('feeding_schedules')
                .update({ horse_id, time_of_day, feed_time })
                .eq('id', id).select().single();
            if (error) throw error;

            await supabase.from('feeding_items').delete().eq('schedule_id', id);
            if (items && items.length > 0) {
                const feedItems = items.map(i => ({ schedule_id: id, feed_type: i.feed_type, amount: i.amount, unit: i.unit }));
                await supabase.from('feeding_items').insert(feedItems);
            }
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;
            await supabase.from('feeding_items').delete().eq('schedule_id', id);
            await supabase.from('feeding_schedules').delete().eq('id', id);
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Feeding error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
