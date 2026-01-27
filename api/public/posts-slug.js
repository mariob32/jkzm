const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const slug = req.query.slug;
    if (!slug) {
        return res.status(400).json({ error: 'Slug is required' });
    }

    try {
        const { data, error } = await supabase
            .from('public_posts')
            .select('id, published_at, title, slug, excerpt, body, cover_url, category, author_name')
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Post not found' });
            }
            throw error;
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Public post detail error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};
