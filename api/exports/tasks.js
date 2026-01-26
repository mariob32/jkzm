const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
        const { from, to, status, format } = req.query;
        
        let query = supabase
            .from('tasks')
            .select('*')
            .order('due_date', { ascending: true });
        
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to + 'T23:59:59');
        if (status && status !== 'all') {
            if (status === 'active') {
                query = query.in('status', ['open', 'in_progress']);
            } else {
                query = query.eq('status', status);
            }
        }
        
        const { data: tasks, error } = await query;
        if (error) throw error;

        // Fetch horses separately
        const horseIds = [...new Set((tasks || []).filter(t => t.horse_id).map(t => t.horse_id))];
        let horsesMap = {};
        if (horseIds.length > 0) {
            const { data: horses } = await supabase
                .from('horses')
                .select('id, name, stable_name, passport_number')
                .in('id', horseIds);
            horsesMap = (horses || []).reduce((acc, h) => { acc[h.id] = h; return acc; }, {});
        }

        // Merge data
        const data = (tasks || []).map(t => ({
            ...t,
            horses: t.horse_id ? horsesMap[t.horse_id] || null : null
        }));

        if (format === 'csv') {
            const priorityLabels = { low: 'Nizka', normal: 'Normalna', high: 'Vysoka', urgent: 'Urgentna' };
            const statusLabels = { open: 'Otvorena', in_progress: 'Rozpracovana', completed: 'Dokoncena', cancelled: 'Zrusena' };
            
            const headers = ['Nazov', 'Popis', 'Priorita', 'Stav', 'Termin', 'Kon', 'Vytvorena'];
            const rows = (data || []).map(row => [
                row.title || '',
                (row.description || '').replace(/"/g, '""').replace(/\n/g, ' '),
                priorityLabels[row.priority] || row.priority,
                statusLabels[row.status] || row.status,
                row.due_date || '',
                row.horses ? (row.horses.stable_name || row.horses.name) : '',
                row.created_at ? row.created_at.split('T')[0] : ''
            ]);
            
            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
            
            const filename = `ulohy-${from || 'all'}-${to || 'all'}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send('\uFEFF' + csv);
        }

        return res.status(200).json(data || []);
    } catch (e) {
        console.error('Export tasks error:', e);
        res.status(500).json({ error: e.message });
    }
};
