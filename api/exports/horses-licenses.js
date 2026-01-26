const { createClient } = require('@supabase/supabase-js');
const { sendCSV, sendEmptyCSV } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = ['id', 'name', 'stable_name', 'passport_number', 'microchip', 'sjf_license_number', 'sjf_license_valid_until', 'fei_id', 'fei_passport_number', 'fei_passport_expiry', 'fei_registered', 'status'];

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
        const { status, expiry_days } = req.query;
        
        let query = supabase
            .from('horses')
            .select('id, name, stable_name, passport_number, microchip, fei_id, fei_passport_number, fei_passport_expiry, fei_registered, sjf_license_number, sjf_license_valid_until, status')
            .order('stable_name', { ascending: true });
        
        if (status === 'active') {
            query = query.eq('status', 'active');
        }
        
        const { data: horses, error } = await query;
        
        if (error) {
            console.error('Export horses-licenses DB error:', error.message);
            return sendEmptyCSV(res, HEADERS, 'horses-licenses');
        }
        
        if (!horses || horses.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'horses-licenses');
        }

        // Filter by expiry if requested
        let filtered = horses;
        if (expiry_days) {
            const days = parseInt(expiry_days);
            const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            filtered = filtered.filter(h => {
                const sjfExpiry = h.sjf_license_valid_until;
                const feiExpiry = h.fei_passport_expiry;
                return (sjfExpiry && sjfExpiry <= cutoff) || (feiExpiry && feiExpiry <= cutoff);
            });
        }

        if (filtered.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'horses-licenses');
        }

        const rows = filtered.map(h => [
            h.id, h.name, h.stable_name, h.passport_number, h.microchip,
            h.sjf_license_number, h.sjf_license_valid_until,
            h.fei_id, h.fei_passport_number, h.fei_passport_expiry,
            h.fei_registered ? 'true' : 'false', h.status
        ]);
        
        return sendCSV(res, HEADERS, rows, 'horses-licenses');
        
    } catch (e) {
        console.error('Export horses-licenses error:', e.message);
        return sendEmptyCSV(res, HEADERS, 'horses-licenses');
    }
};
