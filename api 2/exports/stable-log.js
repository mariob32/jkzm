const { createClient } = require('@supabase/supabase-js');
const { sendCSV, sendEmptyCSV } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = ['id', 'event_date', 'event_time', 'event_type', 'horse_id', 'horse_name', 'passport_number', 'microchip', 'notes', 'responsible_person', 'created_at'];

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
        const { from, to, event_type } = req.query;
        
        let query = supabase
            .from('stable_log')
            .select('id, event_date, event_time, event_type, horse_id, notes, responsible_person, created_at')
            .order('event_date', { ascending: false })
            .order('event_time', { ascending: false });
        
        if (from) query = query.gte('event_date', from);
        if (to) query = query.lte('event_date', to);
        if (event_type) query = query.eq('event_type', event_type);
        
        const { data: logs, error } = await query;
        
        if (error) {
            console.error('Export stable-log DB error:', error.message);
            return sendEmptyCSV(res, HEADERS, 'stable-log');
        }
        
        if (!logs || logs.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'stable-log');
        }

        // Fetch horses separately (bez JOIN-u)
        const horseIds = [...new Set(logs.filter(l => l.horse_id).map(l => l.horse_id))];
        let horsesMap = {};
        if (horseIds.length > 0) {
            try {
                const { data: horses } = await supabase
                    .from('horses')
                    .select('id, name, stable_name, passport_number, microchip')
                    .in('id', horseIds);
                if (horses) {
                    horsesMap = horses.reduce((acc, h) => { 
                        acc[h.id] = { 
                            name: h.stable_name || h.name || '', 
                            passport: h.passport_number || '',
                            chip: h.microchip || ''
                        }; 
                        return acc; 
                    }, {});
                }
            } catch (e) {
                console.error('Export stable-log - horses fetch error:', e.message);
            }
        }

        const rows = logs.map(l => {
            const horse = l.horse_id ? (horsesMap[l.horse_id] || {}) : {};
            return [
                l.id, l.event_date, l.event_time, l.event_type, l.horse_id,
                horse.name || '', horse.passport || '', horse.chip || '',
                l.notes, l.responsible_person, l.created_at
            ];
        });
        
        return sendCSV(res, HEADERS, rows, 'stable-log');
        
    } catch (e) {
        console.error('Export stable-log error:', e.message);
        return sendEmptyCSV(res, HEADERS, 'stable-log');
    }
};
