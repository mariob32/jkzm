const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Excel-friendly CSV escape function
 * - ak field obsahuje ; alebo " alebo newline → obaliť do "
 * - " vnútri → zdvojiť na ""
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // CSV header row - presne v tomto poradi
    const headers = ['id', 'title', 'description', 'priority', 'status', 'due_date', 'horse_id', 'horse_name', 'created_at', 'updated_at'];
    const BOM = '\uFEFF'; // UTF-8 BOM pre Excel

    try {
        const { from, to, status, priority, horse_id } = req.query;
        
        // Default: ak nic nie je zadane, export active uloh z poslednych 90 dni
        const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        let query = supabase
            .from('tasks')
            .select('id, title, description, priority, status, due_date, horse_id, created_at, updated_at')
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });
        
        // Status filter
        if (status && status !== 'all') {
            if (status === 'active') {
                query = query.in('status', ['open', 'in_progress']);
            } else {
                query = query.eq('status', status);
            }
        } else if (!status) {
            // Default: active
            query = query.in('status', ['open', 'in_progress']);
        }
        
        // Date filters
        if (from) {
            query = query.gte('created_at', from);
        } else {
            query = query.gte('created_at', defaultFrom);
        }
        if (to) {
            query = query.lte('created_at', to + 'T23:59:59');
        }
        
        // Priority filter
        if (priority && priority !== 'all') {
            query = query.eq('priority', priority);
        }
        
        // Horse filter
        if (horse_id) {
            query = query.eq('horse_id', horse_id);
        }
        
        const { data: tasks, error } = await query;
        
        // Ak tabulka neexistuje alebo chyba - vrat len header
        if (error) {
            console.error('Export tasks DB error:', error.message);
            const csvHeader = headers.join(';');
            const today = new Date().toISOString().split('T')[0];
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="tasks_${today}.csv"`);
            return res.status(200).send(BOM + csvHeader);
        }
        
        // Ak prazdne - vrat len header
        if (!tasks || tasks.length === 0) {
            const csvHeader = headers.join(';');
            const today = new Date().toISOString().split('T')[0];
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="tasks_${today}.csv"`);
            return res.status(200).send(BOM + csvHeader);
        }

        // Fetch horses separately (bez JOIN-u)
        const horseIds = [...new Set(tasks.filter(t => t.horse_id).map(t => t.horse_id))];
        let horsesMap = {};
        if (horseIds.length > 0) {
            try {
                const { data: horses, error: horsesError } = await supabase
                    .from('horses')
                    .select('id, name, stable_name')
                    .in('id', horseIds);
                if (!horsesError && horses) {
                    horsesMap = horses.reduce((acc, h) => { 
                        acc[h.id] = h.stable_name || h.name || ''; 
                        return acc; 
                    }, {});
                }
            } catch (e) {
                console.error('Export tasks - horses fetch error:', e.message);
                // Pokracuj bez horse_name
            }
        }

        // Build CSV rows
        const rows = tasks.map(t => {
            const horseName = t.horse_id ? (horsesMap[t.horse_id] || '') : '';
            return [
                escapeCSV(t.id),
                escapeCSV(t.title),
                escapeCSV(t.description),
                escapeCSV(t.priority),
                escapeCSV(t.status),
                escapeCSV(t.due_date),
                escapeCSV(t.horse_id),
                escapeCSV(horseName),
                escapeCSV(t.created_at),
                escapeCSV(t.updated_at)
            ].join(';');
        });
        
        const csv = [headers.join(';'), ...rows].join('\n');
        const today = new Date().toISOString().split('T')[0];
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="tasks_${today}.csv"`);
        return res.status(200).send(BOM + csv);
        
    } catch (e) {
        // Pri akejkolvek chybe - vrat prazdny CSV s headerom, nie 500
        console.error('Export tasks error:', e.message);
        const csvHeader = headers.join(';');
        const today = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="tasks_${today}.csv"`);
        return res.status(200).send(BOM + csvHeader);
    }
};
