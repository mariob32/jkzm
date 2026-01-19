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
        if (req.method === 'POST') {
            const { name, email, phone, service, preferred_date, preferred_time, message } = req.body;
            if (!name || !email || !service) return res.status(400).json({ error: 'Meno, email a služba povinné' });
            const { error } = await supabase.from('bookings').insert([{ name, email, phone, service, preferred_date, preferred_time, message }]);
            if (error) throw error;
            return res.status(201).json({ message: 'Rezervácia vytvorená.' });
        }

        if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json(data);
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
