const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logAudit, getRequestInfo } = require('./utils/audit');

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
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            const { data, error } = await supabase.from('horses').select('*').order('name');
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const user = verifyToken(req);
            if (!user) return res.status(401).json({ error: 'Neautorizovany' });
            
            const { ip, user_agent } = getRequestInfo(req);
            
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
            
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'Meno koňa je povinné' });
            }
            
            // Kontrola duplicity (voliteľné - podľa passport_number alebo life_number)
            if (passport_number) {
                const { data: existing } = await supabase
                    .from('horses')
                    .select('id, name')
                    .eq('passport_number', passport_number)
                    .single();
                if (existing) {
                    return res.status(409).json({ 
                        error: `Kôň s číslom pasu ${passport_number} už existuje`,
                        existing_horse: existing.name
                    });
                }
            }
            
            const { data, error } = await supabase.from('horses')
                .insert([{ 
                    name: name.trim(), 
                    stable_name: stable_name?.trim() || null, 
                    breed, color, sex, 
                    birth_date: birth_date || null, 
                    country_of_birth,
                    passport_number: passport_number?.trim() || null, 
                    life_number: life_number?.trim() || null, 
                    microchip: microchip?.trim() || null,
                    fei_id, fei_passport_number, fei_passport_expiry, fei_registered,
                    sjf_license_number, sjf_license_valid_until, sjf_registration_date,
                    owner_name, owner_contact, owner_address,
                    height_cm: height_cm || null, 
                    weight_kg: weight_kg || null, 
                    level, disciplines,
                    insurance_company, insurance_policy, insurance_valid_until, insurance_value,
                    status: status || 'active', 
                    photo_url, 
                    notes 
                }])
                .select().single();
            
            if (error) {
                console.error('Horse insert error:', error);
                // Duplicitný záznam
                if (error.code === '23505') {
                    return res.status(409).json({ 
                        error: 'Kôň s týmito údajmi už existuje',
                        details: error.message
                    });
                }
                // Neplatné dáta
                if (error.code === '22P02' || error.code === '23502') {
                    return res.status(400).json({ 
                        error: 'Neplatné údaje',
                        details: error.message
                    });
                }
                throw error;
            }
            
            await logAudit(supabase, {
                action: 'create',
                entity_type: 'horses',
                entity_id: data.id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: data
            });
            
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Horses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
