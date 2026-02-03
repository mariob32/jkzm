const { createClient } = require('@supabase/supabase-js');
const { sendCSV, sendEmptyCSV } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = ['id', 'title', 'description', 'priority', 'status', 'due_date', 'horse_id', 'horse_name', 'created_at', 'updated_at'];

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
        const { from, to, status, priority, horse_id } = req.query;
        const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        let query = supabase
            .from('tasks')
            .select('id, title, description, priority, status, due_date, horse_id, created_at, updated_at')
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });
        
        if (status && status !== 'all') {
            if (status === 'active') {
                query = query.in('status', ['open', 'in_progress']);
            } else {
                query = query.eq('status', status);
            }
        } else if (!status) {
            query = query.in('status', ['open', 'in_progress']);
        }
        
        if (from) {
            query = query.gte('created_at', from);
        } else {
            query = query.gte('created_at', defaultFrom);
        }
        if (to) query = query.lte('created_at', to + 'T23:59:59');
        if (priority && priority !== 'all') query = query.eq('priority', priority);
        if (horse_id) query = query.eq('horse_id', horse_id);
        
        const { data: tasks, error } = await query;
        
        if (error) {
            console.error('Export tasks DB error:', error.message);
            return sendEmptyCSV(res, HEADERS, 'tasks');
        }
        
        if (!tasks || tasks.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'tasks');
        }

        // Fetch horses separately
        const horseIds = [...new Set(tasks.filter(t => t.horse_id).map(t => t.horse_id))];
        let horsesMap = {};
        if (horseIds.length > 0) {
            try {
                const { data: horses } = await supabase.from('horses').select('id, name, stable_name').in('id', horseIds);
                if (horses) {
                    horsesMap = horses.reduce((acc, h) => { acc[h.id] = h.stable_name || h.name || ''; return acc; }, {});
                }
            } catch (e) {
                console.error('Export tasks - horses fetch error:', e.message);
            }
        }

        const rows = tasks.map(t => [
            t.id, t.title, t.description, t.priority, t.status, t.due_date,
            t.horse_id, t.horse_id ? (horsesMap[t.horse_id] || '') : '',
            t.created_at, t.updated_at
        ]);
        
        return sendCSV(res, HEADERS, rows, 'tasks');
        
    } catch (e) {
        console.error('Export tasks error:', e.message);
        return sendEmptyCSV(res, HEADERS, 'tasks');
    }
};
