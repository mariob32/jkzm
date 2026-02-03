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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            const { data, error } = await supabase.from('trainings')
                .select('*, riders:rider_id (first_name, last_name), horses:horse_id (name), trainers:trainer_id (first_name, last_name)')
                .order('date', { ascending: false });
            if (error) throw error;
            const formatted = data.map(t => ({
                ...t,
                rider_name: t.riders ? `${t.riders.first_name} ${t.riders.last_name}` : null,
                horse_name: t.horses?.name,
                trainer_name: t.trainers ? `${t.trainers.first_name} ${t.trainers.last_name}` : null
            }));
            return res.status(200).json(formatted);
        }
        if (req.method === 'POST') {
            const { rider_id, horse_id, trainer_id, date, start_time, end_time, duration_minutes, training_type, price, notes } = req.body;
            const { data, error } = await supabase.from('trainings')
                .insert([{ 
                    rider_id: rider_id || null, 
                    horse_id: horse_id || null, 
                    trainer_id: trainer_id || null, 
                    date: date || req.body.scheduled_date, 
                    start_time: start_time || req.body.scheduled_time, 
                    end_time,
                    duration_minutes: duration_minutes || req.body.duration || 60, 
                    training_type: training_type || req.body.type || 'individual', 
                    price: price || 0, 
                    trainer_notes: notes, 
                    status: 'scheduled' 
                }])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }
        if (req.method === 'PUT') {
            const { id, rider_id, horse_id, trainer_id, date, start_time, end_time, duration_minutes, training_type, price, notes, status } = req.body;
            const { data, error } = await supabase.from('trainings')
                .update({ 
                    rider_id, horse_id, trainer_id, 
                    date: date || req.body.scheduled_date, 
                    start_time: start_time || req.body.scheduled_time, 
                    end_time,
                    duration_minutes: duration_minutes || req.body.duration, 
                    training_type: training_type || req.body.type, 
                    price, 
                    trainer_notes: notes, 
                    status 
                })
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }
        if (req.method === 'PATCH') {
            const { id, status } = req.body;
            const { data, error } = await supabase.from('trainings')
                .update({ status })
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }
        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('trainings').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Trainings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
