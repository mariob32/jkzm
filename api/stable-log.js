const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logAudit, getRequestInfo } = require('./utils/audit');

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

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Neautorizovany' });
    
    const { ip, user_agent } = getRequestInfo(req);

    try {
        if (req.method === 'GET') {
            const { horse_id, event_type, date_from, date_to } = req.query;
            
            let query = supabase.from('stable_log').select('*').order('event_date', { ascending: false });
            
            if (horse_id) query = query.eq('horse_id', horse_id);
            if (event_type) query = query.eq('event_type', event_type);
            if (date_from) query = query.gte('event_date', date_from);
            if (date_to) query = query.lte('event_date', date_to);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { 
                horse_id, event_type, event_date, event_time, date_to,
                location_from, location_to, reason, responsible_person,
                employee_id, notes 
            } = req.body;
            
            if (!event_type || !event_date || !responsible_person) {
                return res.status(400).json({ error: 'Povinne polia: event_type, event_date, responsible_person' });
            }
            
            const { data, error } = await supabase.from('stable_log')
                .insert([{ 
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
                    notes: notes || null
                }])
                .select().single();
            if (error) throw error;
            
            await logAudit(supabase, {
                action: 'create',
                entity_type: 'stable_log',
                entity_id: data.id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: data
            });
            
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('stable-log error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
