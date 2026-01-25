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
        const { status, expiry_days, format } = req.query;
        
        let query = supabase
            .from('horses')
            .select('id, name, stable_name, passport_number, microchip, fei_id, fei_passport_number, fei_passport_expiry, fei_registered, sjf_license_number, sjf_license_valid_until, status')
            .order('stable_name');
        
        if (status === 'active') {
            query = query.eq('status', 'active');
        }
        
        const { data, error } = await query;
        if (error) throw error;

        let filtered = data || [];
        
        if (expiry_days) {
            const days = parseInt(expiry_days);
            const today = new Date();
            const cutoff = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            
            filtered = filtered.filter(h => {
                const sjfExpiry = h.sjf_license_valid_until;
                const feiExpiry = h.fei_passport_expiry;
                return (sjfExpiry && sjfExpiry <= cutoffStr) || (feiExpiry && feiExpiry <= cutoffStr);
            });
        }

        if (format === 'csv') {
            const headers = ['Kon', 'Volacia meno', 'Pas', 'Cip', 'SJF cislo', 'SJF platnost do', 'FEI cislo', 'FEI platnost do', 'FEI registrovany', 'Status'];
            const rows = filtered.map(row => [
                row.name || '',
                row.stable_name || '',
                row.passport_number || '',
                row.microchip || '',
                row.sjf_license_number || '',
                row.sjf_license_valid_until || '',
                row.fei_passport_number || '',
                row.fei_passport_expiry || '',
                row.fei_registered ? 'Ano' : 'Nie',
                row.status || ''
            ]);
            
            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
            
            const filename = `kone-licencie-${new Date().toISOString().split('T')[0]}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send('\uFEFF' + csv);
        }

        return res.status(200).json(filtered);
    } catch (e) {
        console.error('Export horses-licenses error:', e);
        res.status(500).json({ error: e.message });
    }
};
