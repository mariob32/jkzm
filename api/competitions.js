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

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .order('start_date', { ascending: false });
            if (error) {
                // Ak tabulka neexistuje, vrat prazdne pole
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    return res.status(200).json([]);
                }
                throw error;
            }
            return res.status(200).json(data || []);
        }

        if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

        if (req.method === 'POST') {
            const body = req.body;
            const { data, error } = await supabase.from('competitions')
                .insert([body])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        if (req.method === 'PUT') {
            const { id, ...updateData } = req.body;
            const { data, error } = await supabase.from('competitions')
                .update(updateData)
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('competitions').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Competitions error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
