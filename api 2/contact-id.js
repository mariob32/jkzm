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
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });
    const id = req.query.id;

    try {
        if (req.method === 'PATCH') {
            const { status } = req.body;
            const { data, error } = await supabase.from('contact_messages').update({ status }).eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }
        if (req.method === 'DELETE') {
            await supabase.from('contact_messages').delete().eq('id', id);
            return res.status(200).json({ message: 'Deleted' });
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
