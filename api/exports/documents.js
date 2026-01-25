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
        const { from, to, category, format } = req.query;
        
        let query = supabase
            .from('documents_v2')
            .select('*, horses(id, name, stable_name)')
            .order('document_date', { ascending: false });
        
        if (from) query = query.gte('document_date', from);
        if (to) query = query.lte('document_date', to);
        if (category) query = query.eq('category', category);
        
        const { data, error } = await query;
        if (error) throw error;

        if (format === 'csv') {
            const headers = ['Datum', 'Nazov', 'Kategoria', 'Kon', 'Subor', 'Poznamka'];
            const rows = (data || []).map(row => [
                row.document_date || '',
                row.title || '',
                row.category || '',
                row.horses ? (row.horses.stable_name || row.horses.name) : '',
                row.file_name || '',
                (row.description || '').replace(/"/g, '""')
            ]);
            
            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
            
            const filename = `dokumenty-${from || 'all'}-${to || 'all'}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send('\uFEFF' + csv);
        }

        return res.status(200).json(data || []);
    } catch (e) {
        console.error('Export documents error:', e);
        res.status(500).json({ error: e.message });
    }
};
