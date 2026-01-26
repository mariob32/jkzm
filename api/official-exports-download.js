const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

function getToday() {
    return new Date().toISOString().split('T')[0];
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
            .select('id, type, created_at, zip_bytes')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Official export download error:', error?.message);
            return res.status(404).json({ error: 'Export not found' });
        }

        if (!data.zip_bytes) {
            return res.status(404).json({ error: 'ZIP data not available' });
        }

        // Convert zip_bytes to actual binary buffer
        let zipBuffer;
        const zb = data.zip_bytes;
        
        if (Buffer.isBuffer(zb)) {
            zipBuffer = zb;
        } else if (zb && zb.type === 'Buffer' && Array.isArray(zb.data)) {
            // Supabase returns JSON serialized Buffer
            zipBuffer = Buffer.from(zb.data);
        } else if (typeof zb === 'string') {
            if (zb.startsWith('\\x')) {
                zipBuffer = Buffer.from(zb.slice(2), 'hex');
            } else {
                zipBuffer = Buffer.from(zb, 'base64');
            }
        } else if (Array.isArray(zb)) {
            zipBuffer = Buffer.from(zb);
        } else {
            return res.status(500).json({ error: 'Unknown zip_bytes format', type: typeof zb });
        }

        const exportDate = data.created_at ? data.created_at.split('T')[0] : getToday();
        const shortId = data.id.split('-')[0];
        const filename = `jkzm_${data.type}_export_${exportDate}_${shortId}.zip`;

        // Send as binary using raw response
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': zipBuffer.length
        });
        res.end(zipBuffer, 'binary');

    } catch (e) {
        console.error('Official export download API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
