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
        const { filename, folder = 'uploads', contentType } = req.body;
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename required' });
        }

        // Vygeneruj unikátny názov
        const ext = filename.split('.').pop().toLowerCase();
        const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        
        // Vytvor signed URL pre upload (platná 1 hodinu)
        const { data, error } = await supabase.storage
            .from('uploads')
            .createSignedUploadUrl(uniqueName);

        if (error) throw error;

        // Získaj verejnú URL
        const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(uniqueName);

        return res.status(200).json({ 
            success: true,
            signedUrl: data.signedUrl,
            token: data.token,
            path: uniqueName,
            publicUrl: urlData.publicUrl
        });
    } catch (e) {
        console.error('Signed URL error:', e);
        res.status(500).json({ error: e.message });
    }
};
