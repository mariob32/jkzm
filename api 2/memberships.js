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
            const { data, error } = await supabase
                .from('memberships')
                .select('*, riders:rider_id (first_name, last_name)')
                .order('valid_until', { ascending: false });
            if (error) throw error;
            return res.status(200).json(data.map(m => ({ 
                ...m, 
                rider_name: m.riders ? `${m.riders.first_name} ${m.riders.last_name}` : null 
            })));
        }

        if (req.method === 'POST') {
            const body = req.body;
            const { data, error } = await supabase.from('memberships')
                .insert([body])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        if (req.method === 'PUT') {
            const { id, ...updateData } = req.body;
            const { data, error } = await supabase.from('memberships')
                .update(updateData)
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('memberships').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Memberships error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
