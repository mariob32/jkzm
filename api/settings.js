const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { category } = req.query;
            let query = supabase.from('settings').select('*');
            if (category) query = query.eq('category', category);
            
            const { data, error } = await query;
            if (error) throw error;
            
            // Konvertuj na objekt key: value
            const settings = {};
            data.forEach(s => { settings[s.key] = s.value; });
            return res.status(200).json(settings);
        }

        if (req.method === 'PUT') {
            const updates = req.body; // { key: value, key2: value2 }
            
            for (const [key, value] of Object.entries(updates)) {
                await supabase
                    .from('settings')
                    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            }
            
            return res.status(200).json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
