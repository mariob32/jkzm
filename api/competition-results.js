const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { competition_id, horse_id, rider_id } = req.query;
            
            let query = supabase
                .from('competition_results')
                .select(`*, horses(name), riders(first_name, last_name), competitions(name, date)`)
                .order('placement');
            
            if (competition_id) query = query.eq('competition_id', competition_id);
            if (horse_id) query = query.eq('horse_id', horse_id);
            if (rider_id) query = query.eq('rider_id', rider_id);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const results = Array.isArray(req.body) ? req.body : [req.body];
            const { data, error } = await supabase.from('competition_results').insert(results).select();
            if (error) throw error;
            return res.status(201).json(data);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
