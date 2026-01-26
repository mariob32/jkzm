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

function toBuffer(input) {
    // Already a Buffer
    if (Buffer.isBuffer(input)) {
        return input;
    }
    
    // JSON serialized Buffer: { type: 'Buffer', data: [...] }
    if (input && typeof input === 'object' && input.type === 'Buffer' && Array.isArray(input.data)) {
        return Buffer.from(input.data);
    }
    
    // Hex string from Postgres bytea: \x504b0304...
    if (typeof input === 'string' && input.startsWith('\\x')) {
        return Buffer.from(input.slice(2), 'hex');
    }
    
    // Base64 string
    if (typeof input === 'string') {
        return Buffer.from(input, 'base64');
    }
    
    // Array of bytes
    if (Array.isArray(input)) {
        return Buffer.from(input);
    }
    
    // Fallback
    return Buffer.from(input);
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

        const zipBuffer = toBuffer(data.zip_bytes);

        const exportDate = data.created_at ? data.created_at.split('T')[0] : getToday();
        const shortId = data.id.split('-')[0];
        const filename = `jkzm_${data.type}_export_${exportDate}_${shortId}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', zipBuffer.length);
        return res.status(200).send(zipBuffer);

    } catch (e) {
        console.error('Official export download API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
