const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('partners').select('*').eq('id', id).single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { data, error } = await supabase.from('partners').update(req.body).eq('id', id).select();
            if (error) throw error;
            return res.status(200).json(data[0]);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('partners').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
