const { createClient } = require('@supabase/supabase-js');
const { sendCSV, sendEmptyCSV } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = ['id', 'arrival_date', 'arrival_time', 'departure_time', 'visitor_name', 'organization', 'purpose', 'contact_phone', 'contact_email', 'signature_text', 'notes', 'created_at'];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { from, to } = req.query;
        
        let query = supabase
            .from('visit_log')
            .select('id, arrival_date, arrival_time, departure_time, visitor_name, organization, purpose, contact_phone, contact_email, signature_text, notes, created_at')
            .order('arrival_date', { ascending: false })
            .order('arrival_time', { ascending: false });
        
        if (from) query = query.gte('arrival_date', from);
        if (to) query = query.lte('arrival_date', to);
        
        const { data: visits, error } = await query;
        
        if (error) {
            console.error('Export visit-log DB error:', error.message);
            return sendEmptyCSV(res, HEADERS, 'visit-log');
        }
        
        if (!visits || visits.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'visit-log');
        }

        const rows = visits.map(v => [
            v.id, v.arrival_date, v.arrival_time, v.departure_time,
            v.visitor_name, v.organization, v.purpose,
            v.contact_phone, v.contact_email, v.signature_text,
            v.notes, v.created_at
        ]);
        
        return sendCSV(res, HEADERS, rows, 'visit-log');
        
    } catch (e) {
        console.error('Export visit-log error:', e.message);
        return sendEmptyCSV(res, HEADERS, 'visit-log');
    }
};
