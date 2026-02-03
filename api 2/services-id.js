const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const service = req.body;
            service.updated_at = new Date().toISOString();
            const { data, error } = await supabase.from('services').update(service).eq('id', id).select();
            if (error) throw error;
            return res.status(200).json(data[0]);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('services').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
