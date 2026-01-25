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

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovany' });

    const id = req.query.id;

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('stable_log')
                .select('*, horses(id, name, stable_name), documents_v2(*)')
                .eq('id', id).single();
            if (error || !data) return res.status(404).json({ error: 'Not found' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { 
                horse_id, event_type, event_date, event_time, date_to,
                location_from, location_to, reason, responsible_person,
                employee_id, notes 
            } = req.body;
            
            const { data, error } = await supabase.from('stable_log')
                .update({ 
                    horse_id: horse_id || null, 
                    event_type, 
                    event_date, 
                    event_time: event_time || null,
                    date_to: date_to || null,
                    location_from: location_from || null,
                    location_to: location_to || null,
                    reason: reason || null,
                    responsible_person,
                    employee_id: employee_id || null,
                    notes: notes || null,
                    updated_at: new Date()
                })
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('stable_log').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('stable-log-id error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
