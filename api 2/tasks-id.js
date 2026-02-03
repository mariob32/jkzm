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

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Neautorizovany' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID je povinne' });

    const { ip, user_agent } = getRequestInfo(req);

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Uloha nenajdena' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            // Fetch original data for audit
            const { data: beforeData } = await supabase.from('tasks').select('*').eq('id', id).single();
            
            const { title, description, priority, status, due_date, horse_id, entity_type, entity_id, assigned_to } = req.body;
            
            const updates = {
                updated_at: new Date().toISOString()
            };
            
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (priority !== undefined) updates.priority = priority;
            if (status !== undefined) {
                updates.status = status;
                if (status === 'completed') {
                    updates.completed_at = new Date().toISOString();
                } else if (status === 'open' || status === 'in_progress') {
                    updates.completed_at = null;
                }
            }
            if (due_date !== undefined) updates.due_date = due_date || null;
            if (horse_id !== undefined) updates.horse_id = horse_id || null;
            if (entity_type !== undefined) updates.entity_type = entity_type || null;
            if (entity_id !== undefined) updates.entity_id = entity_id || null;
            if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;
            
            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', id)
                .select('*')
                .single();
            
            if (error) throw error;
            
            // Audit log - UPDATE
            await logAudit(supabase, {
                action: 'update',
                entity_type: 'tasks',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: beforeData,
                after_data: data
            });
            
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            // Fetch original data for audit
            const { data: beforeData } = await supabase.from('tasks').select('*').eq('id', id).single();
            
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Audit log - DELETE
            await logAudit(supabase, {
                action: 'delete',
                entity_type: 'tasks',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: beforeData,
                after_data: null
            });
            
            return res.status(200).json({ success: true, message: 'Uloha zmazana' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Tasks ID API error:', e);
        res.status(500).json({ error: e.message });
    }
};
