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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('riders')
                .select('*, horses:preferred_horse_id (name)')
                .order('last_name');
            if (error) throw error;
            
            const result = await Promise.all(data.map(async (r) => {
                const { count } = await supabase.from('trainings').select('*', { count: 'exact', head: true }).eq('rider_id', r.id);
                return { ...r, preferred_horse_name: r.horses?.name, total_trainings: count || 0 };
            }));
            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            const { first_name, last_name, email, phone, birth_date, level, preferred_horse_id, notes } = req.body;
            if (!first_name || !last_name) return res.status(400).json({ error: 'Meno a priezvisko povinné' });
            const { data, error } = await supabase.from('riders')
                .insert([{ first_name, last_name, email, phone, birth_date, level: level || 'beginner', preferred_horse_id, notes }])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Riders error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
