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

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('horses').select('*').order('name');
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });
            const { name, breed, birth_date, height, color, gender, level, status, notes } = req.body;
            if (!name) return res.status(400).json({ error: 'Meno je povinné' });
            const { data, error } = await supabase.from('horses')
                .insert([{ name, breed, birth_date, height, color, gender, level, status: status || 'active', notes }])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Horses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
