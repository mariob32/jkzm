const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('articles')
                .select(`*, article_categories(name, color)`)
                .eq('id', id)
                .single();
            
            if (error) throw error;
            
            // Increment views (non-blocking)
            supabase.from('articles')
                .update({ views: (data.views || 0) + 1 })
                .eq('id', id)
                .then(() => {})
                .catch(() => {});
            
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const updates = { ...req.body, updated_at: new Date().toISOString() };
            const { data, error } = await supabase.from('articles').update(updates).eq('id', id).select();
            if (error) throw error;
            return res.status(200).json(data[0]);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('articles').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }
    } catch (e) {
        console.error('Article API error:', e);
        res.status(500).json({ error: e.message });
    }
};
