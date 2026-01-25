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
        const { from, to, format } = req.query;
        
        let query = supabase
            .from('stable_log')
            .select('*, horses(id, name, stable_name, passport_number, microchip)')
            .order('event_date', { ascending: false });
        
        if (from) query = query.gte('event_date', from);
        if (to) query = query.lte('event_date', to);
        
        const { data, error } = await query;
        if (error) throw error;

        if (format === 'csv') {
            const headers = ['Datum', 'Cas', 'Typ udalosti', 'Kon', 'Pas', 'Cip', 'Poznamka', 'Zodpovedna osoba'];
            const rows = (data || []).map(row => [
                row.event_date || '',
                row.event_time || '',
                row.event_type || '',
                row.horses ? (row.horses.stable_name || row.horses.name) : '',
                row.horses?.passport_number || '',
                row.horses?.microchip || '',
                (row.notes || '').replace(/"/g, '""'),
                row.responsible_person || ''
            ]);
            
            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
            
            const filename = `mastalna-kniha-${from || 'all'}-${to || 'all'}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send('\uFEFF' + csv);
        }

        return res.status(200).json(data || []);
    } catch (e) {
        console.error('Export stable-log error:', e);
        res.status(500).json({ error: e.message });
    }
};
