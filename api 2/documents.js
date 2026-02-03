const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { category, competition_id, public_only } = req.query;
            
            let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
            
            if (category) query = query.eq('category', category);
            if (competition_id) query = query.eq('competition_id', competition_id);
            if (public_only === 'true') query = query.eq('is_public', true);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const doc = req.body;
            const { data, error } = await supabase.from('documents').insert([doc]).select();
            if (error) throw error;
            return res.status(201).json(data[0]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('documents').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
