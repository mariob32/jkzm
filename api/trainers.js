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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            const { data, error } = await supabase.from('trainers').select('*').order('last_name');
            if (error) throw error;
            return res.status(200).json(data || []);
        }
        if (req.method === 'POST') {
            const { 
                first_name, last_name, email, phone, 
                sjf_license_number, sjf_trainer_level,
                specializations, employment_type, hourly_rate, bio, notes, status
            } = req.body;
            
            if (!first_name || !last_name) {
                return res.status(400).json({ error: 'Meno a priezvisko sú povinné' });
            }
            
            const { data, error } = await supabase.from('trainers')
                .insert([{ 
                    first_name, last_name, email, phone, 
                    sjf_license_number, sjf_trainer_level,
                    specializations, employment_type, 
                    hourly_rate, bio, notes,
                    status: status || 'active'
                }])
                .select().single();
            if (error) {
                console.error('Trainer insert error:', error);
                throw error;
            }
            return res.status(201).json(data);
        }
        if (req.method === 'PUT') {
            const { 
                id, first_name, last_name, email, phone, 
                sjf_license_number, sjf_trainer_level,
                specializations, employment_type, hourly_rate, bio, notes, status
            } = req.body;
            
            const { data, error } = await supabase.from('trainers')
                .update({ 
                    first_name, last_name, email, phone, 
                    sjf_license_number, sjf_trainer_level,
                    specializations, employment_type, 
                    hourly_rate, bio, notes, status,
                    updated_at: new Date()
                })
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }
        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('trainers').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Trainers API error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};
