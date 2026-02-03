const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { album_id, horse_id, rider_id, limit = 50 } = req.query;
            
            let query = supabase
                .from('photos')
                .select(`*, albums(title)`)
                .order('sort_order')
                .limit(parseInt(limit));
            
            if (album_id) query = query.eq('album_id', album_id);
            if (horse_id) query = query.eq('horse_id', horse_id);
            if (rider_id) query = query.eq('rider_id', rider_id);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const photos = Array.isArray(req.body) ? req.body : [req.body];
            const { data, error } = await supabase.from('photos').insert(photos).select();
            if (error) throw error;
            return res.status(201).json(data);
        }

        if (req.method === 'DELETE') {
            const { ids } = req.body;
            if (!ids || !ids.length) return res.status(400).json({ error: 'IDs required' });
            const { error } = await supabase.from('photos').delete().in('id', ids);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
