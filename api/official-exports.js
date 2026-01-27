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
        const { type, limit, offset } = req.query;
        const limitNum = Math.min(parseInt(limit) || 50, 100);
        const offsetNum = parseInt(offset) || 0;

        let query = supabase
            .from('official_exports')
            .select('id, type, created_at, actor_name, filters, size_bytes, files, storage_path, verified_status, verified_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offsetNum, offsetNum + limitNum - 1);

        if (type && (type === 'svps' || type === 'sjf')) {
            query = query.eq('type', type);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Official exports list error:', error.message);
            return res.status(200).json({ data: [], total: 0 });
        }

        return res.status(200).json({ data: data || [], total: count || 0 });

    } catch (e) {
        console.error('Official exports API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
