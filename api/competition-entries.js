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
            const { competition_id, rider_id, status } = req.query;
            
            let query = supabase
                .from('competition_entries')
                .select('*, competitions(id, name, date), riders(id, first_name, last_name), horses(id, name)');
            
            if (competition_id) query = query.eq('competition_id', competition_id);
            if (rider_id) query = query.eq('rider_id', rider_id);
            if (status) query = query.eq('status', status);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { competition_id, rider_id, horse_id, discipline, category, start_number, entry_fee, payment_status, status, notes } = req.body;
            
            if (!competition_id) {
                return res.status(400).json({ error: 'competition_id je povinné' });
            }
            
            const { data, error } = await supabase
                .from('competition_entries')
                .insert([{
                    competition_id,
                    rider_id,
                    horse_id,
                    discipline,
                    category,
                    start_number,
                    entry_fee: entry_fee ? parseFloat(entry_fee) : null,
                    payment_status: payment_status || 'pending',
                    status: status || 'registered',
                    notes
                }])
                .select()
                .single();
            
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Competition entries error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
