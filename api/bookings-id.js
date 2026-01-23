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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    const id = req.query.id;

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, training_spaces(name, color)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'PUT' || req.method === 'PATCH') {
            const updates = req.body;
            
            if (updates.status === 'confirmed' && !updates.confirmed_at) {
                updates.confirmed_at = new Date().toISOString();
            } else if (updates.status === 'cancelled' && !updates.cancelled_at) {
                updates.cancelled_at = new Date().toISOString();
            }
            
            const { data, error } = await supabase
                .from('bookings')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('bookings').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Booking API error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};
