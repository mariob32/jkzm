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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const id = req.query.id;

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('riders').select('*').eq('id', id).single();
            if (error || !data) return res.status(404).json({ error: 'Jazdec nenájdený' });
            return res.status(200).json(data);
        }

        const user = verifyToken(req);
        if (!user) return res.status(401).json({ error: 'Neautorizovaný' });
        
        const { ip, user_agent } = getRequestInfo(req);

        if (req.method === 'DELETE') {
            const { data: before } = await supabase.from('riders').select('*').eq('id', id).single();
            if (!before) return res.status(404).json({ error: 'Jazdec nenájdený' });
            
            // Kontrola závislostí
            const dependencies = [];
            
            // Kontrola training_bookings (RESTRICT)
            const { count: bookingsCount } = await supabase
                .from('training_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('rider_id', id);
            if (bookingsCount > 0) dependencies.push(`${bookingsCount} rezervácií tréningov`);
            
            // Kontrola billing_charges
            const { count: chargesCount } = await supabase
                .from('billing_charges')
                .select('*', { count: 'exact', head: true })
                .eq('rider_id', id);
            if (chargesCount > 0) dependencies.push(`${chargesCount} platobných záznamov`);
            
            // Kontrola trainings
            const { count: trainingsCount } = await supabase
                .from('trainings')
                .select('*', { count: 'exact', head: true })
                .eq('rider_id', id);
            if (trainingsCount > 0) dependencies.push(`${trainingsCount} tréningov`);
            
            // Kontrola memberships
            const { count: membershipsCount } = await supabase
                .from('memberships')
                .select('*', { count: 'exact', head: true })
                .eq('rider_id', id);
            if (membershipsCount > 0) dependencies.push(`${membershipsCount} členských záznamov`);
            
            // Ak existujú závislosti s RESTRICT, nemôžeme vymazať
            if (bookingsCount > 0) {
                return res.status(409).json({ 
                    error: 'Jazdec má aktívne rezervácie tréningov a nemôže byť vymazaný.',
                    details: `Najprv zrušte alebo vymažte: ${dependencies.join(', ')}`,
                    dependencies,
                    suggestion: 'Namiesto vymazania môžete jazdca deaktivovať (status: inactive)'
                });
            }
            
            // Pokus o vymazanie
            const { error } = await supabase.from('riders').delete().eq('id', id);
            if (error) {
                if (error.code === '23503') {
                    return res.status(409).json({ 
                        error: 'Jazdec má súvisiace záznamy a nemôže byť vymazaný.',
                        details: dependencies.length > 0 ? `Súvisiace: ${dependencies.join(', ')}` : error.message,
                        suggestion: 'Namiesto vymazania môžete jazdca deaktivovať (status: inactive)'
                    });
                }
                throw error;
            }
            
            await logAudit(supabase, {
                action: 'delete',
                entity_type: 'rider',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: null
            });
            
            return res.status(200).json({ message: 'Jazdec bol vymazaný' });
        }
        
        if (req.method === 'PUT') {
            const { data: before } = await supabase.from('riders').select('*').eq('id', id).single();
            
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
            const { data, error } = await supabase.from('riders')
                .update({ 
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
                    status, photo_url, notes,
                    updated_at: new Date() 
                })
                .eq('id', id).select().single();
            if (error) throw error;
            
            await logAudit(supabase, {
                action: 'update',
                entity_type: 'rider',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: data
            });
            
            return res.status(200).json(data);
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Rider-id error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};
