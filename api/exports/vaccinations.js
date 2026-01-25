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
        const { expiry_days, overdue_only, format } = req.query;
        
        const { data, error } = await supabase
            .from('vaccinations')
            .select('*, horses(id, name, stable_name, passport_number)')
            .order('next_date', { ascending: true });
        
        if (error) throw error;

        let filtered = data || [];
        const today = new Date().toISOString().split('T')[0];
        
        if (overdue_only === 'true') {
            filtered = filtered.filter(v => v.next_date && v.next_date < today);
        } else if (expiry_days) {
            const days = parseInt(expiry_days);
            const cutoff = new Date(new Date().getTime() + days * 24 * 60 * 60 * 1000);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            filtered = filtered.filter(v => v.next_date && v.next_date <= cutoffStr);
        }

        if (format === 'csv') {
            const headers = ['Kon', 'Pas', 'Typ vakciny', 'Datum ockovania', 'Dalsi termin', 'Sarza', 'Veterinar', 'Poznamka'];
            const rows = filtered.map(row => [
                row.horses ? (row.horses.stable_name || row.horses.name) : '',
                row.horses?.passport_number || '',
                row.vaccine_type || '',
                row.vaccination_date || '',
                row.next_date || '',
                row.batch_number || '',
                row.vet_name || '',
                (row.notes || '').replace(/"/g, '""')
            ]);
            
            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
            
            const filename = `ockovania-${new Date().toISOString().split('T')[0]}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send('\uFEFF' + csv);
        }

        return res.status(200).json(filtered);
    } catch (e) {
        console.error('Export vaccinations error:', e);
        res.status(500).json({ error: e.message });
    }
};
