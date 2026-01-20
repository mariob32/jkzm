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
            const { data, error } = await supabase.from('feeding')
                .select('*, horses:horse_id (name), employees:employee_id (first_name, last_name)')
                .eq('id', id).single();
            if (error || !data) return res.status(404).json({ error: 'Not found' });
            
            return res.status(200).json({ 
                ...data, 
                horse_name: data.horses?.name, 
                fed_by_name: data.employees ? `${data.employees.first_name} ${data.employees.last_name}` : null
            });
        }

        if (req.method === 'PUT') {
            const { horse_id, employee_id, date, time_slot, notes } = req.body;
            const { data, error } = await supabase.from('feeding')
                .update({ horse_id, employee_id, date, time_slot, notes })
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('feeding').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Feeding error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
