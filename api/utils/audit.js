/**
 * JKZM Audit Helper - Audit Trail Pro utilities
 * Logovanie zmien s before/after data a diff
 */

const IGNORED_FIELDS = ['created_at', 'updated_at'];

/**
 * Build diff between two objects - returns only changed fields
 * @param {object} beforeObj - Original data
 * @param {object} afterObj - New data
 * @returns {object} Diff object { field: { from, to }, ... }
 */
function buildDiff(beforeObj, afterObj) {
    if (!beforeObj && !afterObj) return null;
    if (!beforeObj) return null; // create - no diff needed
    if (!afterObj) return null; // delete - no diff needed
    
    const diff = {};
    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    
    for (const key of allKeys) {
        if (IGNORED_FIELDS.includes(key)) continue;
        
        const fromVal = beforeObj[key];
        const toVal = afterObj[key];
        
        // Compare values (handle null, undefined, objects)
        const fromStr = JSON.stringify(fromVal);
        const toStr = JSON.stringify(toVal);
        
        if (fromStr !== toStr) {
            diff[key] = { from: fromVal, to: toVal };
        }
    }
    
    return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * Log audit entry to database (fail-safe)
 * @param {object} supabase - Supabase client
 * @param {object} params - Audit parameters
 * @returns {Promise<void>}
 */
async function logAudit(supabase, {
    action,
    entity_type,
    entity_id = null,
    actor_id = null,
    actor_name = null,
    ip = null,
    user_agent = null,
    before_data = null,
    after_data = null
}) {
    try {
        const diff = buildDiff(before_data, after_data);
        
        const { error } = await supabase.from('audit_logs').insert({
            action: action || 'unknown',
            entity_type: entity_type || 'system',
            entity_id: entity_id || null,
            actor_id: actor_id || null,
            actor_name: actor_name || 'admin',
            ip: ip || null,
            user_agent: user_agent || null,
            before_data: before_data || null,
            after_data: after_data || null,
            diff: diff || null
        });
        
        if (error) {
            console.error('AUDIT_FAIL:', error.message, { action, entity_type, entity_id });
        }
    } catch (e) {
        // Fail-safe: audit error should not break main request
        console.error('AUDIT_FAIL:', e.message, { action, entity_type, entity_id });
    }
}

/**
 * Extract actor info from request
 * @param {object} req - Request object
 * @returns {object} { ip, user_agent }
 */
function getRequestInfo(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
        || req.headers['x-real-ip'] 
        || req.connection?.remoteAddress 
        || null;
    const user_agent = req.headers['user-agent'] || null;
    return { ip, user_agent };
}

module.exports = {
    buildDiff,
    logAudit,
    getRequestInfo,
    IGNORED_FIELDS
};
