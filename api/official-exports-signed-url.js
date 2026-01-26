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

    const { id, ttl: ttlParam } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'Missing id parameter' });
    }

    // TTL: default 3600 (1 hour), max 86400 (24 hours)
    let ttl = parseInt(ttlParam) || 3600;
    if (ttl < 60) ttl = 60;
    if (ttl > 86400) ttl = 86400;

    try {
        const { data, error } = await supabase
            .from('official_exports')
            .select('id, storage_bucket, storage_path')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Official export not found:', error?.message);
            return res.status(404).json({ error: 'Export not found' });
        }

        if (!data.storage_path) {
            return res.status(404).json({ error: 'Export file not available' });
        }

        const bucket = data.storage_bucket || 'exports';

        const { data: urlData, error: urlError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(data.storage_path, ttl);

        if (urlError) {
            console.error('Signed URL error:', urlError.message);
            return res.status(500).json({ error: 'Failed to generate signed URL' });
        }

        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

        // Update signed_url_expires_at in DB (informative)
        await supabase
            .from('official_exports')
            .update({ signed_url_expires_at: expiresAt })
            .eq('id', id);

        return res.status(200).json({
            download_url: urlData.signedUrl,
            expires_at: expiresAt,
            ttl_seconds: ttl
        });

    } catch (e) {
        console.error('Signed URL API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
