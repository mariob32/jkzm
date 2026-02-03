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

    if (!verifyToken(req)) {
        return res.status(401).json({ error: 'Neautorizovaný prístup' });
    }

    try {
        if (req.method === 'GET') {
            const { feeding_id } = req.query;
            
            let query = supabase.from('feeding_items').select('*');
            if (feeding_id) query = query.eq('feeding_id', feeding_id);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { feeding_id, feed_type, quantity, unit, notes } = req.body;
            
            if (!feeding_id || !feed_type || quantity === undefined) {
                return res.status(400).json({ error: 'feeding_id, feed_type a quantity sú povinné' });
            }
            
            const { data, error } = await supabase
                .from('feeding_items')
                .insert([{
                    feeding_id,
                    feed_type,
                    quantity: parseFloat(quantity),
                    unit: unit || 'kg',
                    notes
                }])
                .select()
                .single();
            
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Feeding items error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
