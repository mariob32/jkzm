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
                .from('vaccinations')
                .select('*, horses(id, name)')
                .eq('id', id)
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Očkovanie nenájdené' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { horse_id, vaccine_type, vaccination_date, next_date, batch_number, vet_name, vet_license, notes } = req.body;
            
            const updateData = { updated_at: new Date().toISOString() };
            if (horse_id !== undefined) updateData.horse_id = horse_id;
            if (vaccine_type !== undefined) updateData.vaccine_type = vaccine_type;
            if (vaccination_date !== undefined) updateData.vaccination_date = vaccination_date;
            if (next_date !== undefined) updateData.next_date = next_date;
            if (batch_number !== undefined) updateData.batch_number = batch_number;
            if (vet_name !== undefined) updateData.vet_name = vet_name;
            if (vet_license !== undefined) updateData.vet_license = vet_license;
            if (notes !== undefined) updateData.notes = notes;
            
            const { data, error } = await supabase
                .from('vaccinations')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Očkovanie nenájdené' });
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('vaccinations').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Očkovanie zmazané' });
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Vaccinations ID error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
