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
        let zb = data.zip_bytes;
        
        // Debug: what type is zb?
        const zbType = typeof zb;
        const zbIsBuffer = Buffer.isBuffer(zb);
        const zbIsArray = Array.isArray(zb);
        const zbHasType = zb && typeof zb === 'object' && zb.type;
        const zbFirst = typeof zb === 'string' ? zb.substring(0, 50) : (zb && zb.type ? zb.type : 'n/a');
        
        // If it's a string that looks like JSON, parse it first
        if (typeof zb === 'string' && zb.startsWith('{')) {
            try {
                zb = JSON.parse(zb);
            } catch (e) {
                // Not JSON, continue
            }
        }
        
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
            return res.status(500).json({ 
                error: 'Unknown zip_bytes format', 
                zbType, zbIsBuffer, zbIsArray, zbHasType, zbFirst 
            });
        }

        // Verify ZIP signature
        if (zipBuffer.length < 4 || zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4B) {
            return res.status(500).json({ 
                error: 'Invalid ZIP data', 
                firstBytes: [zipBuffer[0], zipBuffer[1]],
                zbType, zbIsBuffer, zbIsArray, zbHasType, zbFirst
            });
        }

        const exportDate = data.created_at ? data.created_at.split('T')[0] : getToday();
        const shortId = data.id.split('-')[0];
        const filename = `jkzm_${data.type}_export_${exportDate}_${shortId}.zip`;

        // Return as base64 JSON - client will decode
        const base64 = zipBuffer.toString('base64');
        
        return res.status(200).json({
            filename: filename,
            contentType: 'application/zip',
            size: zipBuffer.length,
            data: base64
        });

    } catch (e) {
        console.error('Official export download API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
