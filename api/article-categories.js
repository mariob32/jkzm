const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('article_categories')
                .select('*')
                .order('sort_order');
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const cat = req.body;
            if (!cat.name) return res.status(400).json({ error: 'Názov je povinný' });
            if (!cat.slug) {
                cat.slug = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
            }
            const { data, error } = await supabase.from('article_categories').insert([cat]).select();
            if (error) throw error;
            return res.status(201).json(data[0]);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
