const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { active_only } = req.query;
            let query = supabase.from('services').select('*').order('sort_order');
            if (active_only === 'true') query = query.eq('is_active', true);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const service = req.body;
            service.updated_at = new Date().toISOString();
            const { data, error } = await supabase.from('services').insert([service]).select();
            if (error) throw error;
            return res.status(201).json(data[0]);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
