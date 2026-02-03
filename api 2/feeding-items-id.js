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

    if (!verifyToken(req)) {
        return res.status(401).json({ error: 'Neautorizovaný prístup' });
    }

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Chýba ID' });

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('feeding_items')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Položka nenájdená' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { feed_type, quantity, unit, notes } = req.body;
            
            const updateData = {};
            if (feed_type !== undefined) updateData.feed_type = feed_type;
            if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
            if (unit !== undefined) updateData.unit = unit;
            if (notes !== undefined) updateData.notes = notes;
            
            const { data, error } = await supabase
                .from('feeding_items')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Položka nenájdená' });
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('feeding_items').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Položka zmazaná' });
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Feeding items ID error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
