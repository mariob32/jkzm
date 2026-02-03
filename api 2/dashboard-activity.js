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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        const activities = [];
        const { data: trainings } = await supabase.from('trainings')
            .select('*, riders:rider_id (first_name, last_name), horses:horse_id (name)')
            .eq('status', 'completed').order('updated_at', { ascending: false }).limit(5);
        trainings?.forEach(t => activities.push({
            type: 'training',
            message: `${t.riders?.first_name} ${t.riders?.last_name} dokončil/a tréning s ${t.horses?.name}`,
            time: t.updated_at
        }));
        const { data: bookings } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(3);
        bookings?.forEach(b => activities.push({ type: 'booking', message: `Nová rezervácia od ${b.name}`, time: b.created_at }));
        const { data: messages } = await supabase.from('contact_messages').select('*').eq('status', 'new').order('created_at', { ascending: false }).limit(3);
        messages?.forEach(m => activities.push({ type: 'message', message: `Nová správa od ${m.name}`, time: m.created_at }));
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.status(200).json(activities.slice(0, 10));
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
