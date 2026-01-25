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

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Neautorizovany' });

    try {
        if (req.method === 'GET') {
            const { is_read, is_dismissed, severity, source, horse_id, show_valid, limit } = req.query;
            
            let query = supabase
                .from('notifications')
                .select('*, horses:assigned_horse_id(id, name, stable_name)')
                .order('created_at', { ascending: false });
            
            // Default: nezobrazuj dismissed
            if (is_dismissed === 'true') {
                query = query.eq('is_dismissed', true);
            } else if (is_dismissed !== 'all') {
                query = query.eq('is_dismissed', false);
            }
            
            if (is_read === 'true') query = query.eq('is_read', true);
            if (is_read === 'false') query = query.eq('is_read', false);
            if (severity && severity !== 'all') query = query.eq('severity', severity);
            if (source && source !== 'all') query = query.eq('source', source);
            if (horse_id) query = query.eq('assigned_horse_id', horse_id);
            
            // Platne = bez expirovanych
            if (show_valid === 'true') {
                const today = new Date().toISOString().split('T')[0];
                query = query.or(`expires_at.is.null,expires_at.gte.${today}`);
            }
            
            if (limit) query = query.limit(parseInt(limit));
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { title, message, severity, priority, due_date, assigned_horse_id, entity_type, entity_id } = req.body;
            
            if (!title) {
                return res.status(400).json({ error: 'Nazov je povinny' });
            }
            
            const { data, error } = await supabase
                .from('notifications')
                .insert({
                    title,
                    message: message || null,
                    severity: severity || 'info',
                    priority: priority || 'normal',
                    notification_type: 'manual',
                    source: 'manual',
                    status: 'pending',
                    due_date: due_date || null,
                    assigned_horse_id: assigned_horse_id || null,
                    entity_type: entity_type || null,
                    entity_id: entity_id || null,
                    is_read: false,
                    is_dismissed: false
                })
                .select('*, horses:assigned_horse_id(id, name, stable_name)')
                .single();
            
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Notifications API error:', e);
        res.status(500).json({ error: e.message });
    }
};
