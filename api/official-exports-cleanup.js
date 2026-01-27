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

    const ranAt = new Date().toISOString();
    let auditFailed = false;
    let auditError = null;

    try {
        const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const cutoffISO = cutoffDate.toISOString();

        // Select candidates - exclude already processed
        const { data: candidates, error: selectError } = await supabase
            .from('official_exports')
            .select('id, type, created_at, storage_bucket, storage_path, storage_delete_status')
            .lt('created_at', cutoffISO)
            .is('storage_deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (selectError) {
            console.error('Cleanup select error:', selectError.message);
            return res.status(500).json({ error: 'Failed to query exports' });
        }

        const results = { deleted: 0, not_found: 0, skipped: 0, errors: 0 };
        const items = [];

        // Process candidates
        for (const exp of (candidates || [])) {
            const bucket = exp.storage_bucket || 'exports';
            const storagePath = exp.storage_path;
            
            // Case: missing storage_path
            if (!storagePath) {
                if (dryRun) {
                    items.push({
                        id: exp.id,
                        type: exp.type,
                        created_at: exp.created_at,
                        storage_path: null,
                        status: 'candidate_missing_path'
                    });
                } else {
                    await supabase
                        .from('official_exports')
                        .update({
                            storage_deleted_at: ranAt,
                            storage_delete_status: 'skipped_missing_path',
                            storage_delete_details: { reason: 'storage_path is null', cutoff_date: cutoffISO, ran_at: ranAt }
                        })
                        .eq('id', exp.id);
                    
                    items.push({
                        id: exp.id,
                        type: exp.type,
                        created_at: exp.created_at,
                        storage_path: null,
                        status: 'skipped_missing_path'
                    });
                    results.skipped++;
                }
                continue;
            }

            // Dry run - just report
            if (dryRun) {
                items.push({
                    id: exp.id,
                    type: exp.type,
                    created_at: exp.created_at,
                    storage_path: storagePath,
                    status: 'candidate'
                });
                continue;
            }

            // Try to delete from storage
            try {
                const { data: removeData, error: removeError } = await supabase.storage
                    .from(bucket)
                    .remove([storagePath]);

                if (removeError) {
                    if (removeError.message && (removeError.message.includes('not found') || removeError.message.includes('Object not found'))) {
                        await supabase
                            .from('official_exports')
                            .update({
                                storage_deleted_at: ranAt,
                                storage_delete_status: 'skipped_not_in_storage',
                                storage_delete_details: { reason: 'object not found in storage', storage_path: storagePath, ran_at: ranAt }
                            })
                            .eq('id', exp.id);
                        
                        items.push({
                            id: exp.id,
                            type: exp.type,
                            created_at: exp.created_at,
                            storage_path: storagePath,
                            status: 'skipped_not_in_storage'
                        });
                        results.not_found++;
                    } else {
                        await supabase
                            .from('official_exports')
                            .update({
                                storage_delete_status: 'error',
                                storage_delete_details: { error: removeError.message, storage_path: storagePath, ran_at: ranAt }
                            })
                            .eq('id', exp.id);
                        
                        items.push({
                            id: exp.id,
                            type: exp.type,
                            created_at: exp.created_at,
                            storage_path: storagePath,
                            status: 'error'
                        });
                        results.errors++;
                    }
                } else {
                    // Success
                    await supabase
                        .from('official_exports')
                        .update({
                            storage_deleted_at: ranAt,
                            storage_delete_status: 'deleted',
                            storage_delete_details: { bucket, storage_path: storagePath, ran_at: ranAt }
                        })
                        .eq('id', exp.id);
                    
                    items.push({
                        id: exp.id,
                        type: exp.type,
                        created_at: exp.created_at,
                        storage_path: storagePath,
                        status: 'deleted'
                    });
                    results.deleted++;
                }
            } catch (e) {
                await supabase
                    .from('official_exports')
                    .update({
                        storage_delete_status: 'error',
                        storage_delete_details: { error: e.message, storage_path: storagePath, ran_at: ranAt }
                    })
                    .eq('id', exp.id);
                
                items.push({
                    id: exp.id,
                    type: exp.type,
                    created_at: exp.created_at,
                    storage_path: storagePath,
                    status: 'error'
                });
                results.errors++;
            }
        }

        // Audit log - ALWAYS
        try {
            await logAudit(supabase, {
                action: 'cleanup',
                entity_type: 'official-export',
                entity_id: 'cleanup-batch',
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
                    scanned: (candidates || []).length,
                    deleted: results.deleted,
                    not_found: results.not_found,
                    skipped: results.skipped,
                    errors: results.errors
                }
            });
        } catch (auditErr) {
            console.error('Audit log error:', auditErr.message);
            auditFailed = true;
            auditError = auditErr.message;
        }

        const response = {
            success: true,
            dry_run: dryRun,
            older_than_days: olderThanDays,
            limit,
            cutoff_date: cutoffISO,
            scanned: (candidates || []).length,
            deleted: results.deleted,
            not_found: results.not_found,
            skipped: results.skipped,
            errors: results.errors,
            items
        };

        if (auditFailed) {
            response.audit_failed = true;
            response.audit_error = auditError;
        }

        return res.status(200).json(response);

    } catch (e) {
        console.error('Cleanup API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
