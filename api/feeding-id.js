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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID required' });

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        if (req.method === 'GET') {
            const { data: schedule, error } = await supabase.from('feeding_schedules')
                .select('*, horses:horse_id (name)')
                .eq('id', id).single();
            if (error || !schedule) return res.status(404).json({ error: 'Not found' });
            
            const { data: items } = await supabase.from('feeding_items').select('*').eq('schedule_id', id);
            return res.status(200).json({ ...schedule, horse_name: schedule.horses?.name, items: items || [] });
        }

        if (req.method === 'PUT') {
            const { horse_id, time_of_day, feed_time, items } = req.body;
            const { data, error } = await supabase.from('feeding_schedules')
                .update({ horse_id, time_of_day, feed_time })
                .eq('id', id).select().single();
            if (error) throw error;

            // Update items
            await supabase.from('feeding_items').delete().eq('schedule_id', id);
            if (items && items.length > 0) {
                const feedItems = items.map(i => ({ schedule_id: parseInt(id), feed_type: i.feed_type, amount: i.amount, unit: i.unit }));
                await supabase.from('feeding_items').insert(feedItems);
            }
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            await supabase.from('feeding_items').delete().eq('schedule_id', id);
            const { error } = await supabase.from('feeding_schedules').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Feeding error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
