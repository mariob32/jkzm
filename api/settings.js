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
            
            if (error) {
                console.error('Settings GET error:', error);
                // Ak tabuľka neexistuje, vráť prázdny objekt
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    return res.status(200).json({});
                }
                throw error;
            }
            
            // Konvertuj na objekt key: value
            const settings = {};
            if (data && Array.isArray(data)) {
                data.forEach(s => { 
                    if (s.key) settings[s.key] = s.value || ''; 
                });
            }
            
            console.log('Settings loaded:', Object.keys(settings).length, 'items');
            return res.status(200).json(settings);
        }

        if (req.method === 'PUT' || req.method === 'POST') {
            const updates = req.body;
            
            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({ error: 'Invalid request body' });
            }
            
            console.log('Saving settings:', Object.keys(updates));
            
            for (const [key, value] of Object.entries(updates)) {
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
                    
                if (error) {
                    console.error('Settings upsert error for', key, ':', error);
                }
            }
            
            return res.status(200).json({ success: true });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Settings API error:', e);
        res.status(500).json({ error: e.message });
    }
};
