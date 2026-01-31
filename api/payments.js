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
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            const { data, error } = await supabase.from('payments')
                .select('*, riders:rider_id (first_name, last_name)')
                .order('payment_date', { ascending: false });
            if (error) throw error;
            const formatted = data.map(p => ({ ...p, rider_name: p.riders ? `${p.riders.first_name} ${p.riders.last_name}` : null }));
            return res.status(200).json(formatted);
        }
        if (req.method === 'POST') {
            const { rider_id, training_id, amount, payment_date, payment_method, description } = req.body;
            const { data, error } = await supabase.from('payments')
                .insert([{ rider_id: rider_id || null, training_id: training_id || null, amount, payment_date, payment_method: payment_method || 'cash', description }])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }
        if (req.method === 'PUT') {
            const { id, rider_id, training_id, amount, payment_date, payment_method, description } = req.body;
            const { data, error } = await supabase.from('payments')
                .update({ rider_id, training_id, amount, payment_date, payment_method, description })
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }
        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('payments').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
