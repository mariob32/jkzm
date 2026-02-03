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
            const { data, error } = await supabase.from('health_records')
                .select('*, horses:horse_id (name)')
                .order('record_date', { ascending: false });
            if (error) throw error;
            return res.status(200).json(data.map(r => ({ ...r, horse_name: r.horses?.name })));
        }

        if (req.method === 'POST') {
            const { horse_id, record_date, record_type, description, vet_name, cost, next_date } = req.body;
            if (!horse_id || !record_type) return res.status(400).json({ error: 'horse_id and record_type required' });
            
            const { data, error } = await supabase.from('health_records')
                .insert([{ horse_id, record_date: record_date || new Date().toISOString().split('T')[0], record_type, description, vet_name, cost, next_date }])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        if (req.method === 'PUT') {
            const { id, horse_id, record_date, record_type, description, vet_name, cost, next_date } = req.body;
            const { data, error } = await supabase.from('health_records')
                .update({ horse_id, record_date, record_type, description, vet_name, cost, next_date })
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('health_records').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Health error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
