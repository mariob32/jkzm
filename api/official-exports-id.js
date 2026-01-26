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

    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'Missing id parameter' });
    }

    try {
        const { data, error } = await supabase
            .from('official_exports')
            .select('id, type, created_at, actor_id, actor_name, ip, user_agent, filters, files, manifest, sha256, storage_path, size_bytes')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Official export detail error:', error.message);
            return res.status(404).json({ error: 'Export not found' });
        }

        // Generate signed URL if storage_path exists
        let download_url = null;
        if (data.storage_path) {
            const { data: urlData, error: urlError } = await supabase.storage
                .from('exports')
                .createSignedUrl(data.storage_path, 3600);
            
            if (!urlError && urlData) {
                download_url = urlData.signedUrl;
            }
        }

        return res.status(200).json({
            ...data,
            download_url
        });

    } catch (e) {
        console.error('Official export detail API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
