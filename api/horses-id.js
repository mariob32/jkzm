const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

async function logAudit(entity_type, entity_id, action, user, before_data, after_data) {
    try {
        let changed_fields = null;
        if (action === 'UPDATE' && before_data && after_data) {
            changed_fields = [];
            for (const key of Object.keys(after_data)) {
                if (key === 'updated_at' || key === 'created_at') continue;
                if (JSON.stringify(before_data[key]) !== JSON.stringify(after_data[key])) {
                    changed_fields.push(key);
                }
            }
        }
        await supabase.from('audit_logs').insert({
            entity_type, entity_id, action,
            changed_by: user?.id || null,
            changed_by_name: user?.name || user?.email || null,
            before_data, after_data, changed_fields
        });
    } catch (e) { console.error('Audit error:', e); }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const id = req.query.id;

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('horses').select('*').eq('id', id).single();
            if (error || !data) return res.status(404).json({ error: 'Not found' });
            return res.status(200).json(data);
        }

        const user = verifyToken(req);
        if (!user) return res.status(401).json({ error: 'Neautorizovany' });

        if (req.method === 'PUT') {
            const { data: before } = await supabase.from('horses').select('*').eq('id', id).single();
            
            const { 
                name, stable_name, breed, color, sex, birth_date, country_of_birth,
                passport_number, life_number, microchip,
                fei_id, fei_passport_number, fei_passport_expiry, fei_registered,
                sjf_license_number, sjf_license_valid_until, sjf_registration_date,
                owner_name, owner_contact, owner_address,
                height_cm, weight_kg, level, disciplines,
                insurance_company, insurance_policy, insurance_valid_until, insurance_value,
                status, photo_url, notes
            } = req.body;
            const { data, error } = await supabase.from('horses')
                .update({ 
                    name, stable_name, breed, color, sex, birth_date, country_of_birth,
                    passport_number, life_number, microchip,
                    fei_id, fei_passport_number, fei_passport_expiry, fei_registered,
                    sjf_license_number, sjf_license_valid_until, sjf_registration_date,
                    owner_name, owner_contact, owner_address,
                    height_cm, weight_kg, level, disciplines,
                    insurance_company, insurance_policy, insurance_valid_until, insurance_value,
                    status, photo_url, notes, 
                    updated_at: new Date() 
                })
                .eq('id', id).select().single();
            if (error) throw error;
            
            await logAudit('horses', id, 'UPDATE', user, before, data);
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { data: before } = await supabase.from('horses').select('*').eq('id', id).single();
            const { error } = await supabase.from('horses').delete().eq('id', id);
            if (error) throw error;
            
            await logAudit('horses', id, 'DELETE', user, before, null);
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
