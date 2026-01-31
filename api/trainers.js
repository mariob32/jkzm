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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            const { data, error } = await supabase.from('trainers').select('*').order('last_name');
            if (error) {
                console.error('Trainers GET error:', error);
                throw error;
            }
            return res.status(200).json(data || []);
        }
        if (req.method === 'POST') {
            // Prijmi všetky možné polia z frontendu
            const body = req.body;
            
            // Základné polia (tieto by mali existovať vždy)
            const insertData = {
                first_name: body.first_name,
                last_name: body.last_name
            };
            
            // Voliteľné polia - pridaj len ak sú poskytnuté
            if (body.email) insertData.email = body.email;
            if (body.phone) insertData.phone = body.phone;
            if (body.hourly_rate) insertData.hourly_rate = body.hourly_rate;
            if (body.notes) insertData.notes = body.notes;
            if (body.bio) insertData.bio = body.bio;
            if (body.status) insertData.status = body.status;
            
            // Polia ktoré možno neexistujú v staršej schéme
            if (body.sjf_license_number !== undefined) insertData.sjf_license_number = body.sjf_license_number;
            if (body.sjf_trainer_level !== undefined) insertData.sjf_trainer_level = body.sjf_trainer_level;
            if (body.specializations !== undefined) insertData.specializations = body.specializations;
            if (body.employment_type !== undefined) insertData.employment_type = body.employment_type;
            
            // Starší názov poľa (pre kompatibilitu)
            if (body.specialization && !body.specializations) {
                insertData.specialization = body.specialization;
            }
            
            console.log('Trainers POST - inserting:', insertData);
            
            const { data, error } = await supabase.from('trainers')
                .insert([insertData])
                .select().single();
                
            if (error) {
                console.error('Trainer insert error:', error);
                // Ak zlyhá kvôli neexistujúcemu stĺpcu, skús len základné polia
                if (error.message && error.message.includes('column')) {
                    const basicData = {
                        first_name: body.first_name,
                        last_name: body.last_name,
                        email: body.email || null,
                        phone: body.phone || null,
                        hourly_rate: body.hourly_rate || null,
                        notes: body.notes || null
                    };
                    const { data: data2, error: error2 } = await supabase.from('trainers')
                        .insert([basicData])
                        .select().single();
                    if (error2) throw error2;
                    return res.status(201).json(data2);
                }
                throw error;
            }
            return res.status(201).json(data);
        }
        if (req.method === 'PUT') {
            const body = req.body;
            const id = body.id;
            
            if (!id) return res.status(400).json({ error: 'ID je povinné' });
            
            // Vytvor update objekt len s poskytnutými poľami
            const updateData = { updated_at: new Date() };
            
            if (body.first_name !== undefined) updateData.first_name = body.first_name;
            if (body.last_name !== undefined) updateData.last_name = body.last_name;
            if (body.email !== undefined) updateData.email = body.email;
            if (body.phone !== undefined) updateData.phone = body.phone;
            if (body.hourly_rate !== undefined) updateData.hourly_rate = body.hourly_rate;
            if (body.notes !== undefined) updateData.notes = body.notes;
            if (body.bio !== undefined) updateData.bio = body.bio;
            if (body.status !== undefined) updateData.status = body.status;
            if (body.sjf_license_number !== undefined) updateData.sjf_license_number = body.sjf_license_number;
            if (body.sjf_trainer_level !== undefined) updateData.sjf_trainer_level = body.sjf_trainer_level;
            if (body.specializations !== undefined) updateData.specializations = body.specializations;
            if (body.employment_type !== undefined) updateData.employment_type = body.employment_type;
            if (body.specialization !== undefined) updateData.specialization = body.specialization;
            
            const { data, error } = await supabase.from('trainers')
                .update(updateData)
                .eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }
        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('trainers').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ message: 'Deleted' });
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Trainers API error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};
