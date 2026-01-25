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
            .from('visit_log')
            .select('*')
            .order('arrival_date', { ascending: false });
        
        if (from) query = query.gte('arrival_date', from);
        if (to) query = query.lte('arrival_date', to);
        
        const { data, error } = await query;
        if (error) throw error;

        if (format === 'csv') {
            const headers = ['Datum prichodu', 'Cas prichodu', 'Meno', 'Organizacia', 'Dovod', 'Kontakt tel', 'Kontakt email', 'Podpis', 'Poznamka'];
            const rows = (data || []).map(row => [
                row.arrival_date || '',
                row.arrival_time || '',
                row.visitor_name || '',
                row.organization || '',
                row.purpose || '',
                row.contact_phone || '',
                row.contact_email || '',
                row.signature_text || '',
                (row.notes || '').replace(/"/g, '""')
            ]);
            
            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
            
            const filename = `navstevna-kniha-${from || 'all'}-${to || 'all'}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send('\uFEFF' + csv);
        }

        return res.status(200).json(data || []);
    } catch (e) {
        console.error('Export visit-log error:', e);
        res.status(500).json({ error: e.message });
    }
};
