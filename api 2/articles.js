const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { status, category, featured, limit = 20 } = req.query;
            
            let query = supabase
                .from('articles')
                .select(`*, article_categories(name, color)`)
                .order('is_pinned', { ascending: false })
                .order('published_at', { ascending: false })
                .limit(parseInt(limit));
            
            if (status) query = query.eq('status', status);
            if (category) query = query.eq('category_id', category);
            if (featured === 'true') query = query.eq('is_featured', true);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const article = req.body;
            if (!article.title) return res.status(400).json({ error: 'Názov je povinný' });
            
            // Generuj slug
            if (!article.slug) {
                article.slug = article.title
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
            }
            
            const { data, error } = await supabase.from('articles').insert([article]).select();
            if (error) throw error;
            return res.status(201).json(data[0]);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
