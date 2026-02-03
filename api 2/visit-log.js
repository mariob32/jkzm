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

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovany' });

    try {
        if (req.method === 'GET') {
            const { date_from, date_to, search } = req.query;
            
            let query = supabase.from('visit_log').select('*').order('arrival_date', { ascending: false });
            
            if (date_from) query = query.gte('arrival_date', date_from);
            if (date_to) query = query.lte('arrival_date', date_to);
            if (search) {
                query = query.or(`visitor_name.ilike.%${search}%,organization.ilike.%${search}%,purpose.ilike.%${search}%`);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { 
                visitor_name, organization, purpose, contact_phone, contact_email,
                arrival_date, arrival_time, departure_date, departure_time,
                escort_person, safety_briefing, signature_text, notes 
            } = req.body;
            
            if (!visitor_name || !purpose || !arrival_date || !arrival_time || !escort_person) {
                return res.status(400).json({ error: 'Povinne polia: visitor_name, purpose, arrival_date, arrival_time, escort_person' });
            }
            
            const { data, error } = await supabase.from('visit_log')
                .insert([{ 
                    visitor_name, 
                    organization: organization || null, 
                    purpose, 
                    contact_phone: contact_phone || null,
                    contact_email: contact_email || null,
                    arrival_date,
                    arrival_time,
                    departure_date: departure_date || null,
                    departure_time: departure_time || null,
                    escort_person,
                    safety_briefing: safety_briefing || false,
                    signature_text: signature_text || null,
                    notes: notes || null
                }])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('visit-log error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
