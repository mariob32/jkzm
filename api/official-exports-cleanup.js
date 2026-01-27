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

function parseIntParam(v, def) {
    if (v === undefined || v === null || v === '') return def;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : def;
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
    
    const dryRun = req.query.dry_run === '1' || req.query.dry_run === 'true';
    const olderThanDays = Math.max(parseIntParam(req.query.older_than_days, 30), 0);
    const limit = Math.min(Math.max(parseIntParam(req.query.limit, 50), 1), 500);

    try {
        const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const cutoffISO = cutoffDate.toISOString();

        // Select candidates for cleanup
        const { data: candidates, error: selectError } = await supabase
            .from('official_exports')
            .select('id, type, created_at, storage_bucket, storage_path')
            .lt('created_at', cutoffISO)
            .is('storage_deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (selectError) {
            console.error('Cleanup select error:', selectError.message);
            return res.status(500).json({ error: 'Failed to query exports' });
        }

        if (!candidates || candidates.length === 0) {
            // Audit even when no candidates
            await logAudit(supabase, {
                action: 'cleanup',
                entity_type: 'official-export',
                entity_id: 'batch',
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: {
                    dry_run: dryRun,
                    older_than_days: olderThanDays,
                    limit,
                    cutoff_date: cutoffISO,
                    scanned: 0,
                    deleted: 0,
                    not_found: 0,
                    errors: 0
                }
            });

            return res.status(200).json({
                success: true,
                dry_run: dryRun,
                older_than_days: olderThanDays,
                limit,
                cutoff_date: cutoffISO,
                scanned: 0,
                deleted: 0,
                not_found: 0,
                errors: 0,
                items: []
            });
        }

        // If dry run, just return candidates
        if (dryRun) {
            const items = candidates.map(c => ({
                id: c.id,
                type: c.type,
                created_at: c.created_at,
                storage_path: c.storage_path,
                status: 'candidate'
            }));

            await logAudit(supabase, {
                action: 'cleanup',
                entity_type: 'official-export',
                entity_id: 'batch',
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: {
                    dry_run: true,
                    older_than_days: olderThanDays,
                    limit,
                    cutoff_date: cutoffISO,
                    scanned: candidates.length,
                    deleted: 0,
                    not_found: 0,
                    errors: 0
                }
            });

            return res.status(200).json({
                success: true,
                dry_run: true,
                older_than_days: olderThanDays,
                limit,
                cutoff_date: cutoffISO,
                scanned: candidates.length,
                deleted: 0,
                not_found: 0,
                errors: 0,
                items
            });
        }

        // Process each candidate
        const results = {
            deleted: 0,
            not_found: 0,
            errors: 0
        };
        const items = [];

        for (const exp of candidates) {
            const bucket = exp.storage_bucket || 'exports';
            const storagePath = exp.storage_path;
            
            let status = 'error';
            let details = null;

            if (!storagePath) {
                status = 'not-found';
                details = { error: 'No storage path' };
                results.not_found++;
            } else {
                try {
                    const { error: removeError } = await supabase.storage
                        .from(bucket)
                        .remove([storagePath]);

                    if (removeError) {
                        if (removeError.message && removeError.message.includes('not found')) {
                            status = 'not-found';
                            details = { error: removeError.message };
                            results.not_found++;
                        } else {
                            status = 'error';
                            details = { error: removeError.message };
                            results.errors++;
                        }
                    } else {
                        status = 'deleted';
                        results.deleted++;
                    }
                } catch (e) {
                    status = 'error';
                    details = { error: e.message };
                    results.errors++;
                }
            }

            // Update DB record
            await supabase
                .from('official_exports')
                .update({
                    storage_deleted_at: new Date().toISOString(),
                    storage_delete_status: status,
                    storage_delete_details: details
                })
                .eq('id', exp.id);

            items.push({
                id: exp.id,
                type: exp.type,
                created_at: exp.created_at,
                storage_path: storagePath,
                status
            });
        }

        // Audit log
        await logAudit(supabase, {
            action: 'cleanup',
            entity_type: 'official-export',
            entity_id: 'batch',
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: null,
            after_data: {
                dry_run: false,
                limit,
                older_than_days: olderThanDays,
                cutoff_date: cutoffISO,
                scanned: candidates.length,
                deleted: results.deleted,
                not_found: results.not_found,
                errors: results.errors
            }
        });

        return res.status(200).json({
            success: true,
            dry_run: false,
            older_than_days: olderThanDays,
            limit,
            cutoff_date: cutoffISO,
            scanned: candidates.length,
            deleted: results.deleted,
            not_found: results.not_found,
            errors: results.errors,
            items
        });

    } catch (e) {
        console.error('Cleanup API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
