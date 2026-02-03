const { createClient } = require('@supabase/supabase-js');
const { sendCSV, sendEmptyCSV } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = ['id', 'horse_id', 'horse_name', 'passport_number', 'vaccine_type', 'vaccination_date', 'next_date', 'batch_number', 'vet_name', 'notes', 'created_at'];

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
        const { expiry_days, overdue_only, horse_id } = req.query;
        
        let query = supabase
            .from('vaccinations')
            .select('id, horse_id, vaccine_type, vaccination_date, next_date, batch_number, vet_name, notes, created_at')
            .order('next_date', { ascending: true });
        
        if (horse_id) query = query.eq('horse_id', horse_id);
        
        const { data: vaccinations, error } = await query;
        
        if (error) {
            console.error('Export vaccinations DB error:', error.message);
            return sendEmptyCSV(res, HEADERS, 'vaccinations');
        }
        
        if (!vaccinations || vaccinations.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'vaccinations');
        }

        // Filter by expiry
        let filtered = vaccinations;
        const today = new Date().toISOString().split('T')[0];
        
        if (overdue_only === 'true') {
            filtered = filtered.filter(v => v.next_date && v.next_date < today);
        } else if (expiry_days) {
            const days = parseInt(expiry_days);
            const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            filtered = filtered.filter(v => v.next_date && v.next_date <= cutoff);
        }

        if (filtered.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'vaccinations');
        }

        // Fetch horses separately (bez JOIN-u)
        const horseIds = [...new Set(filtered.filter(v => v.horse_id).map(v => v.horse_id))];
        let horsesMap = {};
        if (horseIds.length > 0) {
            try {
                const { data: horses } = await supabase
                    .from('horses')
                    .select('id, name, stable_name, passport_number')
                    .in('id', horseIds);
                if (horses) {
                    horsesMap = horses.reduce((acc, h) => { 
                        acc[h.id] = { 
                            name: h.stable_name || h.name || '', 
                            passport: h.passport_number || ''
                        }; 
                        return acc; 
                    }, {});
                }
            } catch (e) {
                console.error('Export vaccinations - horses fetch error:', e.message);
            }
        }

        const rows = filtered.map(v => {
            const horse = v.horse_id ? (horsesMap[v.horse_id] || {}) : {};
            return [
                v.id, v.horse_id, horse.name || '', horse.passport || '',
                v.vaccine_type, v.vaccination_date, v.next_date,
                v.batch_number, v.vet_name, v.notes, v.created_at
            ];
        });
        
        return sendCSV(res, HEADERS, rows, 'vaccinations');
        
    } catch (e) {
        console.error('Export vaccinations error:', e.message);
        return sendEmptyCSV(res, HEADERS, 'vaccinations');
    }
};
