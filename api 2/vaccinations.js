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
            const { horse_id } = req.query;
            
            let query = supabase.from('vaccinations').select('*, horses(id, name)');
            if (horse_id) query = query.eq('horse_id', horse_id);
            
            const { data, error } = await query.order('vaccination_date', { ascending: false });
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { horse_id, vaccine_type, vaccination_date, next_date, batch_number, vet_name, vet_license, notes } = req.body;
            
            if (!horse_id || !vaccine_type || !vaccination_date) {
                return res.status(400).json({ error: 'horse_id, vaccine_type a vaccination_date sú povinné' });
            }
            
            const { data, error } = await supabase
                .from('vaccinations')
                .insert([{
                    horse_id,
                    vaccine_type,
                    vaccination_date,
                    next_date,
                    batch_number,
                    vet_name,
                    vet_license,
                    notes
                }])
                .select()
                .single();
            
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Vaccinations error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
