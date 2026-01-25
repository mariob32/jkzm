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
                .from('competition_results')
                .select('*, competitions(id, name), riders(id, first_name, last_name), horses(id, name)')
                .eq('id', id)
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Výsledok nenájdený' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { competition_id, rider_id, horse_id, discipline, place, score, time_seconds, penalties, notes } = req.body;
            
            const updateData = {};
            if (competition_id !== undefined) updateData.competition_id = competition_id;
            if (rider_id !== undefined) updateData.rider_id = rider_id;
            if (horse_id !== undefined) updateData.horse_id = horse_id;
            if (discipline !== undefined) updateData.discipline = discipline;
            if (place !== undefined) updateData.place = place;
            if (score !== undefined) updateData.score = score;
            if (time_seconds !== undefined) updateData.time_seconds = time_seconds;
            if (penalties !== undefined) updateData.penalties = penalties;
            if (notes !== undefined) updateData.notes = notes;
            
            const { data, error } = await supabase
                .from('competition_results')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Výsledok nenájdený' });
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('competition_results').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Výsledok zmazaný' });
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Competition results ID error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
