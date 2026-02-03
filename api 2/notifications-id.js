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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Neautorizovany' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID je povinne' });

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('notifications')
                .select('*, horses:assigned_horse_id(id, name, stable_name)')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Upozornenie nenajdene' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { is_read, is_dismissed, status, title, message, severity, priority } = req.body;
            
            const updates = {};
            
            if (is_read !== undefined) updates.is_read = is_read;
            if (is_dismissed !== undefined) updates.is_dismissed = is_dismissed;
            if (status !== undefined) updates.status = status;
            if (title !== undefined) updates.title = title;
            if (message !== undefined) updates.message = message;
            if (severity !== undefined) updates.severity = severity;
            if (priority !== undefined) updates.priority = priority;
            
            const { data, error } = await supabase
                .from('notifications')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Notifications ID API error:', e);
        res.status(500).json({ error: e.message });
    }
};
