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
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID je povinné', hint: 'Chýba parameter id v URL' });

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        // GET - detail tréningu
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('trainings')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) {
                console.error('Training GET error:', error);
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ error: 'Tréning nenájdený', details: `ID: ${id}` });
                }
                throw error;
            }
            
            if (!data) {
                return res.status(404).json({ error: 'Tréning nenájdený', details: `ID: ${id}` });
            }
            
            return res.status(200).json(data);
        }

        // PUT - aktualizácia tréningu
        if (req.method === 'PUT') {
            const body = req.body;
            
            // Validácia povinných polí
            const date = body.date || body.scheduled_date;
            const start_time = body.start_time || body.scheduled_time;
            
            if (!date) {
                return res.status(400).json({ error: 'Dátum je povinný', hint: 'Vyplňte pole date' });
            }
            
            // Priprav update objekt - len poskytnuté polia (BEZ updated_at - stĺpec neexistuje)
            const updateData = {};
            
            // Mapovanie polí z frontendu
            if (body.rider_id !== undefined) updateData.rider_id = body.rider_id || null;
            if (body.horse_id !== undefined) updateData.horse_id = body.horse_id || null;
            if (body.trainer_id !== undefined) updateData.trainer_id = body.trainer_id || null;
            if (date) updateData.date = date;
            if (start_time) updateData.start_time = start_time;
            if (body.end_time !== undefined) updateData.end_time = body.end_time;
            if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes || body.duration || 60;
            if (body.training_type !== undefined) updateData.training_type = body.training_type || body.type;
            if (body.price !== undefined) updateData.price = body.price;
            if (body.status !== undefined) updateData.status = body.status;
            if (body.trainer_notes !== undefined) updateData.trainer_notes = body.trainer_notes;
            if (body.notes !== undefined) updateData.trainer_notes = body.notes; // alias
            
            console.log('Training PUT - updating id:', id, 'with:', updateData);
            
            const { data, error } = await supabase
                .from('trainings')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) {
                console.error('Training PUT error:', error);
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ error: 'Tréning nenájdený', details: `ID: ${id}` });
                }
                return res.status(500).json({ error: 'Chyba pri aktualizácii', details: error.message });
            }
            
            return res.status(200).json(data);
        }

        // PATCH - čiastočná aktualizácia (napr. len status)
        if (req.method === 'PATCH') {
            const updateData = {};
            
            // Pridaj len poskytnuté polia
            if (req.body.status !== undefined) updateData.status = req.body.status;
            if (req.body.trainer_notes !== undefined) updateData.trainer_notes = req.body.trainer_notes;
            
            const { data, error } = await supabase
                .from('trainings')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) {
                console.error('Training PATCH error:', error);
                return res.status(500).json({ error: 'Chyba pri aktualizácii', details: error.message });
            }
            
            return res.status(200).json(data);
        }

        // DELETE - vymazanie tréningu
        if (req.method === 'DELETE') {
            // Najprv over či existuje
            const { data: existing } = await supabase
                .from('trainings')
                .select('id')
                .eq('id', id)
                .single();
            
            if (!existing) {
                return res.status(404).json({ error: 'Tréning nenájdený', details: `ID: ${id}` });
            }
            
            const { error } = await supabase.from('trainings').delete().eq('id', id);
            if (error) {
                console.error('Training DELETE error:', error);
                return res.status(500).json({ error: 'Chyba pri mazaní', details: error.message });
            }
            
            return res.status(200).json({ message: 'Tréning vymazaný', id });
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Trainings-id API error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
