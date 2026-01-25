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
                .from('competition_entries')
                .select('*, competitions(id, name, date), riders(id, first_name, last_name), horses(id, name)')
                .eq('id', id)
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Prihláška nenájdená' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { rider_id, horse_id, discipline, category, start_number, entry_fee, payment_status, status, notes } = req.body;
            
            const updateData = { updated_at: new Date().toISOString() };
            if (rider_id !== undefined) updateData.rider_id = rider_id;
            if (horse_id !== undefined) updateData.horse_id = horse_id;
            if (discipline !== undefined) updateData.discipline = discipline;
            if (category !== undefined) updateData.category = category;
            if (start_number !== undefined) updateData.start_number = start_number;
            if (entry_fee !== undefined) updateData.entry_fee = parseFloat(entry_fee);
            if (payment_status !== undefined) updateData.payment_status = payment_status;
            if (status !== undefined) updateData.status = status;
            if (notes !== undefined) updateData.notes = notes;
            
            const { data, error } = await supabase
                .from('competition_entries')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Prihláška nenájdená' });
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('competition_entries').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Prihláška zmazaná' });
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Competition entries ID error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
