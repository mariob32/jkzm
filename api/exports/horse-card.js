const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'ID kona je povinne' });
        
        const { data: horse, error: horseError } = await supabase
            .from('horses')
            .select('*')
            .eq('id', id)
            .single();
        
        if (horseError) throw horseError;
        if (!horse) return res.status(404).json({ error: 'Kon nenajdeny' });

        const { data: vaccinations } = await supabase
            .from('vaccinations')
            .select('*')
            .eq('horse_id', id)
            .order('vaccination_date', { ascending: false })
            .limit(10);

        const { data: documents } = await supabase
            .from('documents_v2')
            .select('id, title, category, document_date, file_name')
            .eq('horse_id', id)
            .order('document_date', { ascending: false })
            .limit(10);

        const { data: stableLog } = await supabase
            .from('stable_log')
            .select('*')
            .eq('horse_id', id)
            .order('event_date', { ascending: false })
            .limit(5);

        return res.status(200).json({
            horse,
            vaccinations: vaccinations || [],
            documents: documents || [],
            stable_log: stableLog || []
        });
    } catch (e) {
        console.error('Export horse-card error:', e);
        res.status(500).json({ error: e.message });
    }
};
