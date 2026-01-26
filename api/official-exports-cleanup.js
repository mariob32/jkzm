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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ip, user_agent } = getRequestInfo(req);
    const daysParam = parseInt(req.query.days) || 30;
    const days = Math.max(1, Math.min(365, daysParam));

    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffISO = cutoffDate.toISOString();

        // Find old exports
        const { data: oldExports, error: selectError } = await supabase
            .from('official_exports')
            .select('id, storage_bucket, storage_path')
            .lt('created_at', cutoffISO);

        if (selectError) {
            console.error('Cleanup select error:', selectError.message);
            return res.status(500).json({ error: 'Failed to query old exports' });
        }

        if (!oldExports || oldExports.length === 0) {
            return res.status(200).json({
                success: true,
                deleted_count: 0,
                days: days,
                message: 'No exports older than ' + days + ' days'
            });
        }

        // Delete from Storage
        const storageDeletes = [];
        for (const exp of oldExports) {
            if (exp.storage_path) {
                const bucket = exp.storage_bucket || 'exports';
                storageDeletes.push({ bucket, path: exp.storage_path });
            }
        }

        // Group by bucket
        const byBucket = {};
        for (const sd of storageDeletes) {
            if (!byBucket[sd.bucket]) byBucket[sd.bucket] = [];
            byBucket[sd.bucket].push(sd.path);
        }

        for (const [bucket, paths] of Object.entries(byBucket)) {
            const { error: removeError } = await supabase.storage
                .from(bucket)
                .remove(paths);
            
            if (removeError) {
                console.error('Storage delete error for bucket', bucket, ':', removeError.message);
            }
        }

        // Delete from DB
        const ids = oldExports.map(e => e.id);
        const { error: deleteError } = await supabase
            .from('official_exports')
            .delete()
            .in('id', ids);

        if (deleteError) {
            console.error('DB delete error:', deleteError.message);
            return res.status(500).json({ error: 'Failed to delete from database' });
        }

        // Audit log
        await logAudit(supabase, {
            action: 'delete',
            entity_type: 'official-export',
            entity_id: null,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: null,
            after_data: {
                deleted_count: oldExports.length,
                days: days,
                cutoff_date: cutoffISO,
                deleted_ids: ids
            }
        });

        return res.status(200).json({
            success: true,
            deleted_count: oldExports.length,
            days: days,
            cutoff_date: cutoffISO
        });

    } catch (e) {
        console.error('Cleanup API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
