const { createClient } = require('@supabase/supabase-js');
const { sendCSV, sendEmptyCSV } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS_BASE = ['id', 'created_at', 'action', 'entity_type', 'entity_id', 'actor_name', 'ip', 'user_agent', 'diff_json'];
const HEADERS_WITH_AFTER = ['id', 'created_at', 'action', 'entity_type', 'entity_id', 'actor_name', 'ip', 'user_agent', 'diff_json', 'after_data_json'];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { from, to, entity_type, action, actor_name, entity_id, include_after_data } = req.query;
        const includeAfter = include_after_data === '1' || include_after_data === 'true';
        
        const selectFields = includeAfter
            ? 'id, created_at, action, entity_type, entity_id, actor_name, ip, user_agent, diff, after_data'
            : 'id, created_at, action, entity_type, entity_id, actor_name, ip, user_agent, diff';
        
        let query = supabase
            .from('audit_logs')
            .select(selectFields)
            .order('created_at', { ascending: false })
            .limit(1000);
        
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to + 'T23:59:59');
        if (entity_type && entity_type !== 'all') query = query.eq('entity_type', entity_type);
        if (action && action !== 'all') query = query.eq('action', action);
        if (entity_id) query = query.eq('entity_id', entity_id);
        if (actor_name) query = query.ilike('actor_name', `%${actor_name}%`);
        
        const { data: logs, error } = await query;
        
        const headers = includeAfter ? HEADERS_WITH_AFTER : HEADERS_BASE;
        
        if (error) {
            console.error('Export audit-logs DB error:', error.message);
            return sendEmptyCSV(res, headers, 'audit-logs');
        }
        
        if (!logs || logs.length === 0) {
            return sendEmptyCSV(res, headers, 'audit-logs');
        }

        const rows = logs.map(l => {
            const baseRow = [
                l.id,
                l.created_at,
                l.action,
                l.entity_type,
                l.entity_id,
                l.actor_name,
                l.ip,
                l.user_agent,
                l.diff ? JSON.stringify(l.diff) : ''
            ];
            
            if (includeAfter) {
                baseRow.push(l.after_data ? JSON.stringify(l.after_data) : '');
            }
            
            return baseRow;
        });
        
        return sendCSV(res, headers, rows, 'audit-logs');
        
    } catch (e) {
        console.error('Export audit-logs error:', e.message);
        return sendEmptyCSV(res, HEADERS_BASE, 'audit-logs');
    }
};
