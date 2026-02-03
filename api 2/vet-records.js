const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET - List all vet records
    if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        const { horse_id, record_type } = req.query;
        
        let query = supabase
            .from('vet_records')
            .select(`
                *,
                horses (id, name)
            `)
            .order('record_date', { ascending: false });
        
        if (horse_id) query = query.eq('horse_id', horse_id);
        if (record_type) query = query.eq('record_type', record_type);
        
        const { data, error } = await query;
        
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data || []);
    }

    // POST - Create new vet record
    if (req.method === 'POST') {
        const {
            horse_id,
            record_type,
            record_date,
            next_due_date,
            vet_name,
            vet_license,
            vet_clinic,
            vaccine_name,
            vaccine_batch,
            vaccine_manufacturer,
            diagnosis,
            medication,
            dosage,
            withdrawal_period_days,
            competition_clearance_date,
            document_url,
            passport_entry_page,
            cost,
            notes
        } = req.body;

        const { data, error } = await supabase
            .from('vet_records')
            .insert([{
                horse_id,
                record_type,
                record_date: record_date || req.body.date,
                next_due_date,
                vet_name: vet_name || req.body.veterinarian,
                vet_license,
                vet_clinic: vet_clinic || req.body.clinic,
                vaccine_name,
                vaccine_batch,
                vaccine_manufacturer,
                diagnosis,
                medication,
                dosage,
                withdrawal_period_days,
                competition_clearance_date,
                document_url,
                passport_entry_page,
                cost,
                notes
            }])
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
