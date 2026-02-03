const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { public_only } = req.query;
            
            let query = supabase
                .from('albums')
                .select(`*, photos(count)`)
                .order('sort_order')
                .order('created_at', { ascending: false });
            
            if (public_only === 'true') query = query.eq('is_public', true);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const album = req.body;
            if (!album.title) return res.status(400).json({ error: 'Názov je povinný' });
            
            if (!album.slug) {
                album.slug = album.title
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-');
            }
            
            const { data, error } = await supabase.from('albums').insert([album]).select();
            if (error) throw error;
            return res.status(201).json(data[0]);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
