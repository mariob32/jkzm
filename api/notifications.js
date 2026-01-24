const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { type, status, assigned_trainer_id, limit } = req.query;
            
            let query = supabase
                .from('notifications')
                .select('*, trainers(first_name, last_name), horses(name)')
                .order('created_at', { ascending: false });
            
            if (type) query = query.eq('type', type);
            if (status) query = query.eq('status', status);
            if (assigned_trainer_id) query = query.eq('assigned_trainer_id', assigned_trainer_id);
            if (limit) query = query.limit(parseInt(limit));
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { 
                type, title, message, priority,
                assigned_trainer_id, assigned_horse_id,
                due_date, status 
            } = req.body;
            
            const { data, error } = await supabase
                .from('notifications')
                .insert({
                    type: type || 'info',
                    title,
                    message,
                    priority: priority || 'normal',
                    assigned_trainer_id,
                    assigned_horse_id,
                    due_date,
                    status: status || 'pending'
                })
                .select()
                .single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        if (req.method === 'PUT') {
            const { id, ...updates } = req.body;
            if (!id) return res.status(400).json({ error: 'ID required' });
            
            if (updates.status === 'completed') {
                updates.completed_at = new Date().toISOString();
            }
            
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
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID required' });
            
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Notifications API error:', e);
        res.status(500).json({ error: e.message });
    }
};
