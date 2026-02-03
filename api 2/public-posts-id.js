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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const { ip, user_agent } = getRequestInfo(req);

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('public_posts')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'PATCH') {
            const { data: before } = await supabase
                .from('public_posts')
                .select('*')
                .eq('id', id)
                .single();

            const updates = {};
            const allowedFields = [
                'title', 'slug', 'excerpt', 'body',
                'cover_url', 'category', 'is_published', 
                'author_name', 'published_at'
            ];

            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            const { data, error } = await supabase
                .from('public_posts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'update',
                entity_type: 'public-post',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: data
            });

            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { data: before } = await supabase
                .from('public_posts')
                .select('*')
                .eq('id', id)
                .single();

            const { error } = await supabase
                .from('public_posts')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logAudit(supabase, {
                action: 'delete',
                entity_type: 'public-post',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: null
            });

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Public-posts-id error:', error);
        return res.status(500).json({ error: error.message });
    }
};
