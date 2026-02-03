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

    try {
        const { category, limit = 20, offset = 0 } = req.query;

        let query = supabase
            .from('public_posts')
            .select('id, published_at, title, slug, excerpt, cover_url, category, author_name', { count: 'exact' })
            .eq('is_published', true);

        if (category) query = query.eq('category', category);

        query = query
            .order('published_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        // Return public-safe data only (no internal IDs exposed beyond what's needed)
        return res.status(200).json({ 
            posts: data,
            total: count,
            has_more: (parseInt(offset) + data.length) < count
        });
    } catch (error) {
        console.error('Public posts error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};
