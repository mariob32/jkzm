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
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.from('trainings')
            .select('*, riders:rider_id (first_name, last_name), horses:horse_id (name), trainers:trainer_id (first_name, last_name)')
            .eq('date', today).order('start_time');
        if (error) throw error;
        const formatted = data.map(t => ({
            ...t,
            rider_name: t.riders ? `${t.riders.first_name} ${t.riders.last_name}` : null,
            horse_name: t.horses?.name,
            trainer_name: t.trainers ? `${t.trainers.first_name} ${t.trainers.last_name}` : null
        }));
        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
