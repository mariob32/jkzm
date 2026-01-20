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

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('riders')
                .select('*')
                .order('last_name');
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { 
                first_name, last_name, birth_date, gender, nationality,
                email, phone, address,
                sjf_license_number, sjf_license_type, sjf_license_valid_until,
                szvj_date, szvj_certificate_number,
                fei_id, fei_registered, fei_license_valid_until,
                category, level, disciplines,
                highest_level_jumping, highest_level_dressage,
                medical_certificate_valid, medical_certificate_date, medical_certificate_expiry,
                health_notes, insurance_company, insurance_valid_until,
                gdpr_consent, gdpr_consent_date, photo_consent,
                emergency_contact_name, emergency_contact_phone,
                status, photo_url, notes
            } = req.body;
            if (!first_name || !last_name) return res.status(400).json({ error: 'Meno a priezvisko povinné' });
            const { data, error } = await supabase.from('riders')
                .insert([{ 
                    first_name, last_name, birth_date, gender, nationality,
                    email, phone, address,
                    sjf_license_number, sjf_license_type, sjf_license_valid_until,
                    szvj_date, szvj_certificate_number,
                    fei_id, fei_registered, fei_license_valid_until,
                    category, level: level || 'beginner', disciplines,
                    highest_level_jumping, highest_level_dressage,
                    medical_certificate_valid, medical_certificate_date, medical_certificate_expiry,
                    health_notes, insurance_company, insurance_valid_until,
                    gdpr_consent, gdpr_consent_date, photo_consent,
                    emergency_contact_name, emergency_contact_phone,
                    status: status || 'active', photo_url, notes
                }])
                .select().single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Riders error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
