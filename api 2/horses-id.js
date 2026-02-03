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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
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
        
        const { ip, user_agent } = getRequestInfo(req);

        if (req.method === 'PUT') {
            const { data: before } = await supabase.from('horses').select('*').eq('id', id).single();
            
            const { 
                name, stable_name, breed, color, sex, birth_date, birth_year, country_of_birth,
                passport_number, life_number, microchip,
                fei_id, fei_passport_number, fei_passport_expiry, fei_registered,
                sjf_license_number, sjf_license_valid_until, sjf_registration_date,
                owner_name, owner_contact, owner_address,
                height_cm, weight_kg, level, disciplines,
                insurance_company, insurance_policy, insurance_valid_until, insurance_value,
                status, photo_url, notes, is_active
            } = req.body;
            
            const { data, error } = await supabase.from('horses')
                .update({ 
                    name, stable_name, breed, color, sex, birth_date, birth_year, country_of_birth,
                    passport_number, life_number, microchip,
                    fei_id, fei_passport_number, fei_passport_expiry, fei_registered,
                    sjf_license_number, sjf_license_valid_until, sjf_registration_date,
                    owner_name, owner_contact, owner_address,
                    height_cm, weight_kg, level, disciplines,
                    insurance_company, insurance_policy, insurance_valid_until, insurance_value,
                    status, photo_url, notes, is_active,
                    updated_at: new Date() 
                })
                .eq('id', id).select().single();
            if (error) throw error;
            
            await logAudit(supabase, {
                action: 'update',
                entity_type: 'horse',
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

        if (req.method === 'PATCH') {
            // Get before data
            const { data: before } = await supabase.from('horses').select('*').eq('id', id).single();
            if (!before) return res.status(404).json({ error: 'Not found' });
            
            // Only update provided fields
            const updates = { updated_at: new Date() };
            const allowedFields = [
                'name', 'stable_name', 'breed', 'color', 'sex', 'birth_date', 'birth_year',
                'country_of_birth', 'passport_number', 'life_number', 'microchip',
                'fei_id', 'fei_passport_number', 'fei_passport_expiry', 'fei_registered',
                'sjf_license_number', 'sjf_license_valid_until', 'sjf_registration_date',
                'owner_name', 'owner_contact', 'owner_address',
                'height_cm', 'weight_kg', 'level', 'disciplines',
                'insurance_company', 'insurance_policy', 'insurance_valid_until', 'insurance_value',
                'status', 'photo_url', 'notes', 'is_active'
            ];
            
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }
            
            const { data, error } = await supabase.from('horses')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Determine action type
            let action = 'update';
            if (updates.is_active === false || updates.status === 'inactive') {
                action = 'deactivate';
            }
            
            await logAudit(supabase, {
                action,
                entity_type: 'horse',
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

        if (req.method === 'DELETE') {
            const { data: before } = await supabase.from('horses').select('*').eq('id', id).single();
            if (!before) return res.status(404).json({ error: 'Kôň nenájdený' });
            
            // Kontrola závislostí pred vymazaním
            const dependencies = [];
            
            // Kontrola training_bookings (RESTRICT)
            const { count: bookingsCount } = await supabase
                .from('training_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('horse_id', id);
            if (bookingsCount > 0) dependencies.push(`${bookingsCount} rezervácií tréningov`);
            
            // Kontrola billing_charges
            const { count: chargesCount } = await supabase
                .from('billing_charges')
                .select('*', { count: 'exact', head: true })
                .eq('horse_id', id);
            if (chargesCount > 0) dependencies.push(`${chargesCount} platobných záznamov`);
            
            // Kontrola health_events
            const { count: healthCount } = await supabase
                .from('health_events')
                .select('*', { count: 'exact', head: true })
                .eq('horse_id', id);
            if (healthCount > 0) dependencies.push(`${healthCount} zdravotných záznamov`);
            
            // Kontrola stable_log
            const { count: stableCount } = await supabase
                .from('stable_log')
                .select('*', { count: 'exact', head: true })
                .eq('horse_id', id);
            if (stableCount > 0) dependencies.push(`${stableCount} záznamov v denníku`);
            
            // Kontrola trainings
            const { count: trainingsCount } = await supabase
                .from('trainings')
                .select('*', { count: 'exact', head: true })
                .eq('horse_id', id);
            if (trainingsCount > 0) dependencies.push(`${trainingsCount} tréningov`);
            
            // Ak existujú závislosti s RESTRICT, nemôžeme vymazať
            if (bookingsCount > 0) {
                return res.status(409).json({ 
                    error: 'Kôň má aktívne rezervácie tréningov a nemôže byť vymazaný.',
                    details: `Najprv zrušte alebo vymažte: ${dependencies.join(', ')}`,
                    dependencies,
                    suggestion: 'Namiesto vymazania môžete koňa deaktivovať (status: inactive)'
                });
            }
            
            // Pokus o vymazanie
            const { error } = await supabase.from('horses').delete().eq('id', id);
            if (error) {
                // FK constraint error
                if (error.code === '23503') {
                    return res.status(409).json({ 
                        error: 'Kôň má súvisiace záznamy a nemôže byť vymazaný.',
                        details: dependencies.length > 0 ? `Súvisiace: ${dependencies.join(', ')}` : error.message,
                        suggestion: 'Namiesto vymazania môžete koňa deaktivovať (status: inactive)'
                    });
                }
                throw error;
            }
            
            await logAudit(supabase, {
                action: 'delete',
                entity_type: 'horse',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: null
            });
            
            return res.status(200).json({ message: 'Kôň bol vymazaný' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Horse-id error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
