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
        const { from, to, severity, source, format } = req.query;
        
        let query = supabase
            .from('notifications')
            .select('*, horses:assigned_horse_id(id, name, stable_name)')
            .eq('is_dismissed', false)
            .order('created_at', { ascending: false });
        
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to + 'T23:59:59');
        if (severity && severity !== 'all') query = query.eq('severity', severity);
        if (source && source !== 'all') query = query.eq('source', source);
        
        const { data, error } = await query;
        if (error) throw error;

        if (format === 'csv') {
            const severityLabels = { info: 'Info', warning: 'Varovanie', danger: 'Kriticke' };
            const sourceLabels = { manual: 'Manualne', rule: 'Automaticke' };
            
            const headers = ['Nazov', 'Sprava', 'Zavaznost', 'Zdroj', 'Kon', 'Precitane', 'Vytvorene'];
            const rows = (data || []).map(row => [
                row.title || '',
                (row.message || '').replace(/"/g, '""').replace(/\n/g, ' '),
                severityLabels[row.severity] || row.severity,
                sourceLabels[row.source] || row.source,
                row.horses ? (row.horses.stable_name || row.horses.name) : '',
                row.is_read ? 'Ano' : 'Nie',
                row.created_at ? row.created_at.split('T')[0] : ''
            ]);
            
            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
            
            const filename = `upozornenia-${from || 'all'}-${to || 'all'}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send('\uFEFF' + csv);
        }

        return res.status(200).json(data || []);
    } catch (e) {
        console.error('Export notifications error:', e);
        res.status(500).json({ error: e.message });
    }
};
