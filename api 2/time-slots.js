const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { space_id, day_of_week } = req.query;
            let query = supabase.from('time_slots')
                .select('*, training_spaces(name, color)')
                .eq('is_active', true)
                .order('day_of_week')
                .order('start_time');
            
            if (space_id) query = query.eq('space_id', space_id);
            if (day_of_week !== undefined) query = query.eq('day_of_week', parseInt(day_of_week));
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { data, error } = await supabase
                .from('time_slots')
                .insert([req.body])
                .select()
                .single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        if (req.method === 'PUT') {
            const { id, ...updates } = req.body;
            const { data, error } = await supabase
                .from('time_slots')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            const { error } = await supabase.from('time_slots').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
