const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { slug, exclude_id } = req.query;

        if (!slug) {
            return res.status(400).json({ error: 'slug parameter is required' });
        }

        let query = supabase
            .from('public_posts')
            .select('id')
            .eq('slug', slug);

        // Ak editujeme existujúci post, vylúčiť ho
        if (exclude_id) {
            query = query.neq('id', exclude_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const available = !data || data.length === 0;

        return res.status(200).json({ 
            slug,
            available,
            suggestion: available ? null : generateSlugSuggestion(slug)
        });
    } catch (error) {
        console.error('Slug check error:', error);
        return res.status(500).json({ error: error.message });
    }
};

function generateSlugSuggestion(baseSlug) {
    // Generuj návrh s číslom
    const timestamp = Date.now().toString(36).slice(-4);
    return `${baseSlug}-${timestamp}`;
}
