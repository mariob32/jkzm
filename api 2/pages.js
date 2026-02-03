const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { menu_only, published_only } = req.query;
            
            let query = supabase.from('pages').select('*').order('menu_order');
            
            if (menu_only === 'true') query = query.eq('show_in_menu', true);
            if (published_only === 'true') query = query.eq('is_published', true);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const page = req.body;
            if (!page.title || !page.slug) return res.status(400).json({ error: 'Názov a slug sú povinné' });
            
            const { data, error } = await supabase.from('pages').insert([page]).select();
            if (error) throw error;
            return res.status(201).json(data[0]);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
