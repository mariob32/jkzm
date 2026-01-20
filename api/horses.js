const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('horses').select('*').order('name');
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });
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
            if (!name) return res.status(400).json({ error: 'Meno je povinné' });
            const { data, error } = await supabase.from('horses')
                .insert([{ 
                    name, stable_name, breed, color, sex, birth_date, country_of_birth,
                    passport_number, life_number, microchip,
                    fei_id, fei_passport_number, fei_passport_expiry, fei_registered,
                    sjf_license_number, sjf_license_valid_until, sjf_registration_date,
                    owner_name, owner_contact, owner_address,
                    height_cm, weight_kg, level, disciplines,
                    insurance_company, insurance_policy, insurance_valid_until, insurance_value,
                    status: status || 'active', photo_url, notes 
                }])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Horses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
