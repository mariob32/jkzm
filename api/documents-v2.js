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

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Neautorizovany' });
    
    const { ip, user_agent } = getRequestInfo(req);

    try {
        if (req.method === 'GET') {
            const { horse_id, category, date_from, date_to, stable_log_id, visit_log_id, search, is_club } = req.query;
            
            let query = supabase.from('documents_v2')
                .select('*')
                .order('document_date', { ascending: false });
            
            if (horse_id) query = query.eq('horse_id', horse_id);
            if (category) query = query.eq('category', category);
            if (date_from) query = query.gte('document_date', date_from);
            if (date_to) query = query.lte('document_date', date_to);
            if (stable_log_id) query = query.eq('stable_log_id', stable_log_id);
            if (visit_log_id) query = query.eq('visit_log_id', visit_log_id);
            if (is_club === 'true') query = query.eq('is_club_document', true);
            if (search) {
                query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { 
                title, description, category, document_date, file_url, file_name,
                mime_type, file_size, tags, horse_id, rider_id, trainer_id, 
                employee_id, stable_log_id, visit_log_id, is_club_document 
            } = req.body;
            
            if (!title || !category) {
                return res.status(400).json({ error: 'Povinne polia: title, category' });
            }
            
            const { data, error } = await supabase.from('documents_v2')
                .insert([{ 
                    title, 
                    description: description || null, 
                    category, 
                    document_date: document_date || null,
                    file_url: file_url || null,
                    file_name: file_name || null,
                    mime_type: mime_type || null,
                    file_size: file_size || null,
                    tags: tags || null,
                    horse_id: horse_id || null,
                    rider_id: rider_id || null,
                    trainer_id: trainer_id || null,
                    employee_id: employee_id || null,
                    stable_log_id: stable_log_id || null,
                    visit_log_id: visit_log_id || null,
                    is_club_document: is_club_document || false,
                    created_by: user?.userId || null
                }])
                .select().single();
            if (error) throw error;
            
            await logAudit(supabase, {
                action: 'create',
                entity_type: 'documents_v2',
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
        console.error('documents-v2 error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
