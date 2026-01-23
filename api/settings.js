const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
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
            if (data) {
                data.forEach(s => { settings[s.key] = s.value; });
            }
            return res.status(200).json(settings);
        }

        if (req.method === 'PUT' || req.method === 'POST') {
            const updates = req.body; // { key: value, key2: value2 }
            
            for (const [key, value] of Object.entries(updates)) {
                // Determine category from key
                let category = 'general';
                if (key.startsWith('contact_') || key === 'google_maps_embed') category = 'contact';
                if (key.startsWith('social_')) category = 'social';
                
                const { error } = await supabase
                    .from('settings')
                    .upsert({ 
                        key, 
                        value: value || '', 
                        category,
                        updated_at: new Date().toISOString() 
                    }, { 
                        onConflict: 'key' 
                    });
                    
                if (error) console.error('Settings upsert error:', key, error);
            }
            
            return res.status(200).json({ success: true });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Settings API error:', e);
        res.status(500).json({ error: e.message });
    }
};
