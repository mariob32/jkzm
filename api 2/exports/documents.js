const { createClient } = require('@supabase/supabase-js');
const { sendCSV, sendEmptyCSV } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = ['id', 'document_date', 'title', 'category', 'horse_id', 'horse_name', 'entity_type', 'entity_id', 'file_name', 'file_url', 'description', 'created_at'];

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
        const { from, to, category, horse_id, entity_type } = req.query;
        
        let query = supabase
            .from('documents_v2')
            .select('id, document_date, title, category, horse_id, entity_type, entity_id, file_name, file_url, description, created_at')
            .order('document_date', { ascending: false });
        
        if (from) query = query.gte('document_date', from);
        if (to) query = query.lte('document_date', to);
        if (category) query = query.eq('category', category);
        if (horse_id) query = query.eq('horse_id', horse_id);
        if (entity_type) query = query.eq('entity_type', entity_type);
        
        const { data: docs, error } = await query;
        
        if (error) {
            console.error('Export documents DB error:', error.message);
            return sendEmptyCSV(res, HEADERS, 'documents');
        }
        
        if (!docs || docs.length === 0) {
            return sendEmptyCSV(res, HEADERS, 'documents');
        }

        // Fetch horses separately (bez JOIN-u)
        const horseIds = [...new Set(docs.filter(d => d.horse_id).map(d => d.horse_id))];
        let horsesMap = {};
        if (horseIds.length > 0) {
            try {
                const { data: horses } = await supabase
                    .from('horses')
                    .select('id, name, stable_name')
                    .in('id', horseIds);
                if (horses) {
                    horsesMap = horses.reduce((acc, h) => { 
                        acc[h.id] = h.stable_name || h.name || ''; 
                        return acc; 
                    }, {});
                }
            } catch (e) {
                console.error('Export documents - horses fetch error:', e.message);
            }
        }

        const rows = docs.map(d => [
            d.id, d.document_date, d.title, d.category,
            d.horse_id, d.horse_id ? (horsesMap[d.horse_id] || '') : '',
            d.entity_type, d.entity_id, d.file_name, d.file_url,
            d.description, d.created_at
        ]);
        
        return sendCSV(res, HEADERS, rows, 'documents');
        
    } catch (e) {
        console.error('Export documents error:', e.message);
        return sendEmptyCSV(res, HEADERS, 'documents');
    }
};
