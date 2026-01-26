const { createClient } = require('@supabase/supabase-js');
const { sendCSV, sendEmptyCSV } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = ['id', 'title', 'message', 'severity', 'source', 'horse_id', 'horse_name', 'entity_type', 'entity_id', 'is_read', 'is_dismissed', 'expires_at', 'created_at'];

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
        const { from, to, severity, source, is_dismissed } = req.query;
        
        let query = supabase
            .from('notifications')
            .select('id, title, message, severity, source, assigned_horse_id, entity_type, entity_id, is_read, is_dismissed, expires_at, created_at')
            .order('created_at', { ascending: false });
        
        // Default: nezrusene
        if (is_dismissed === 'true') {
            query = query.eq('is_dismissed', true);
        } else if (is_dismissed !== 'all') {
            query = query.eq('is_dismissed', false);
        }
        
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to + 'T23:59:59');
        if (severity && severity !== 'all') query = query.eq('severity', severity);
        if (source && source !== 'all') query = query.eq('source', source);
        
        const { data: notifications, error } = await query;
        
        if (error) {
            console.error('Export notifications DB error:', error.message);
            return sendEmptyCSV(res, HEADERS, 'notifications');
        }
        
        if (!notifications || notifications.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'notifications');
        }

        // Fetch horses separately (bez JOIN-u)
        const horseIds = [...new Set(notifications.filter(n => n.assigned_horse_id).map(n => n.assigned_horse_id))];
        let horsesMap = {};
        if (horseIds.length > 0) {
            try {
                const { data: horses } = await supabase
                    .from('horses')
                    .select('id, name, stable_name')
                    .in('id', horseIds);
                if (horses) {
                    horsesMap = horses.reduce((acc, h) => { 
                        acc[h.id] = h.stable_name || h.name || ''; 
                        return acc; 
                    }, {});
                }
            } catch (e) {
                console.error('Export notifications - horses fetch error:', e.message);
            }
        }

        const rows = notifications.map(n => [
            n.id, n.title, n.message, n.severity, n.source,
            n.assigned_horse_id, n.assigned_horse_id ? (horsesMap[n.assigned_horse_id] || '') : '',
            n.entity_type, n.entity_id, n.is_read, n.is_dismissed,
            n.expires_at, n.created_at
        ]);
        
        return sendCSV(res, HEADERS, rows, 'notifications');
        
    } catch (e) {
        console.error('Export notifications error:', e.message);
        return sendEmptyCSV(res, HEADERS, 'notifications');
    }
};
