const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { file, filename, folder = 'logos' } = req.body;
        
        if (!file || !filename) {
            return res.status(400).json({ error: 'File and filename required' });
        }

        // Dekóduj base64
        const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Vygeneruj unikátny názov
        const ext = filename.split('.').pop();
        const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        
        // Upload do Supabase Storage
        const { data, error } = await supabase.storage
            .from('uploads')
            .upload(uniqueName, buffer, {
                contentType: `image/${ext}`,
                upsert: false
            });

        if (error) throw error;

        // Získaj verejnú URL
        const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(uniqueName);

        return res.status(200).json({ 
            success: true, 
            url: urlData.publicUrl,
            path: uniqueName
        });
    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ error: e.message });
    }
};
