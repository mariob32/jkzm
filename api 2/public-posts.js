const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logAudit, getRequestInfo } = require('./utils/audit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 80);
}

async function generateUniqueSlug(supabase, baseSlug) {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
        const { data, error } = await supabase
            .from('public_posts')
            .select('id')
            .eq('slug', slug)
            .limit(1);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return slug;
        }
        
        counter++;
        slug = `${baseSlug}-${counter}`;
        
        // Safety limit
        if (counter > 100) {
            slug = `${baseSlug}-${Date.now().toString(36)}`;
            break;
        }
    }
    
    return slug;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (req.method === 'GET') {
            const { 
                is_published, category,
                limit = 50, offset = 0 
            } = req.query;

            let query = supabase
                .from('public_posts')
                .select('*', { count: 'exact' });

            if (is_published !== undefined) {
                query = query.eq('is_published', is_published === 'true' || is_published === '1');
            }
            if (category) query = query.eq('category', category);

            query = query
                .order('published_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            return res.status(200).json({ data, total: count });
        }

        if (req.method === 'POST') {
            const { ip, user_agent } = getRequestInfo(req);
            
            const { 
                title, slug, excerpt, body, 
                cover_url, category, is_published, author_name 
            } = req.body;

            if (!title) {
                return res.status(400).json({ error: 'title je povinný' });
            }

            // Generate unique slug
            const baseSlug = slug || slugify(title);
            const finalSlug = await generateUniqueSlug(supabase, baseSlug);

            const { data, error } = await supabase
                .from('public_posts')
                .insert([{
                    title,
                    slug: finalSlug,
                    excerpt: excerpt || null,
                    body: body || null,
                    cover_url: cover_url || null,
                    category: category || 'news',
                    is_published: is_published !== false,
                    author_name: author_name || user.email || null
                }])
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'create',
                entity_type: 'public-post',
                entity_id: data.id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: data
            });

            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Public-posts error:', error);
        return res.status(500).json({ error: error.message });
    }
};
