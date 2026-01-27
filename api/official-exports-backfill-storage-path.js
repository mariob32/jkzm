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
    const limit = Math.min(Math.max(parseIntParam(req.query.limit, 100), 1), 500);

    const ranAt = new Date().toISOString();
    let auditFailed = false;
    let auditError = null;

    try {
        // Find exports with missing storage_path
        const { data: candidates, error: selectError } = await supabase
            .from('official_exports')
            .select('id, type, created_at, storage_bucket')
            .is('storage_path', null)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (selectError) {
            console.error('Backfill select error:', selectError.message);
            return res.status(500).json({ error: 'Failed to query exports' });
        }

        const results = { found_in_storage: 0, not_found: 0, updated: 0, errors: 0 };
        const items = [];

        for (const exp of (candidates || [])) {
            const bucket = exp.storage_bucket || 'exports';
            const candidatePath = `official-exports/${exp.id}.zip`;
            
            // Check if file exists in storage by trying to get signed URL
            try {
                const { data: urlData, error: urlError } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(candidatePath, 60);

                if (urlError) {
                    // File not found
                    items.push({
                        id: exp.id,
                        type: exp.type,
                        created_at: exp.created_at,
                        candidate_path: candidatePath,
                        status: 'not_found_in_storage'
                    });
                    results.not_found++;
                } else {
                    // File exists
                    if (dryRun) {
                        items.push({
                            id: exp.id,
                            type: exp.type,
                            created_at: exp.created_at,
                            candidate_path: candidatePath,
                            status: 'found_would_update'
                        });
                        results.found_in_storage++;
                    } else {
                        // Update storage_path
                        const { error: updateError } = await supabase
                            .from('official_exports')
                            .update({ storage_path: candidatePath })
                            .eq('id', exp.id);

                        if (updateError) {
                            items.push({
                                id: exp.id,
                                type: exp.type,
                                created_at: exp.created_at,
                                candidate_path: candidatePath,
                                status: 'update_error',
                                error: updateError.message
                            });
                            results.errors++;
                        } else {
                            items.push({
                                id: exp.id,
                                type: exp.type,
                                created_at: exp.created_at,
                                candidate_path: candidatePath,
                                status: 'updated'
                            });
                            results.updated++;
                            results.found_in_storage++;
                        }
                    }
                }
            } catch (e) {
                items.push({
                    id: exp.id,
                    type: exp.type,
                    created_at: exp.created_at,
                    candidate_path: candidatePath,
                    status: 'error',
                    error: e.message
                });
                results.errors++;
            }
        }

        // Audit log
        try {
            await logAudit(supabase, {
                action: 'backfill',
                entity_type: 'official-export',
                entity_id: 'backfill-batch',
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: {
                    dry_run: dryRun,
                    limit,
                    scanned: (candidates || []).length,
                    found_in_storage: results.found_in_storage,
                    not_found: results.not_found,
                    updated: results.updated,
                    errors: results.errors,
                    ran_at: ranAt
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
            limit,
            scanned: (candidates || []).length,
            found_in_storage: results.found_in_storage,
            not_found: results.not_found,
            updated: results.updated,
            errors: results.errors,
            items
        };

        if (auditFailed) {
            response.audit_failed = true;
            response.audit_error = auditError;
        }

        return res.status(200).json(response);

    } catch (e) {
        console.error('Backfill API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
