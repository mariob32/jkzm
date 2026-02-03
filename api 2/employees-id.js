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

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
            if (error || !data) return res.status(404).json({ error: 'Not found' });
            return res.status(200).json(data);
        }

        if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

        if (req.method === 'PUT') {
            const { first_name, last_name, email, phone, position, hire_date } = req.body;
            const { data, error } = await supabase.from('employees')
                .update({ first_name, last_name, email, phone, position, hire_date })
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Employees error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
