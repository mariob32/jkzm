const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (req.method === 'GET') {
            const { status, priority, horse_id, assigned_to } = req.query;
            
            let query = supabase
                .from('tasks')
                .select(`
                    *,
                    horses(id, name, stable_name),
                    assigned:admin_users!tasks_assigned_to_fkey(id, username)
                `)
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });
            
            if (status) query = query.eq('status', status);
            if (priority) query = query.eq('priority', priority);
            if (assigned_to) query = query.eq('assigned_to', assigned_to);
            if (horse_id) query = query.eq('horse_id', horse_id);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { title, description, priority, due_date, horse_id, assigned_to } = req.body;
            
            if (!title) {
                return res.status(400).json({ error: 'Názov úlohy je povinný' });
            }
            
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    title,
                    description,
                    priority: priority || 'normal',
                    status: 'open',
                    due_date: due_date || null,
                    horse_id: horse_id || null,
                    assigned_to: assigned_to || null
                })
                .select()
                .single();
            
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Tasks API error:', e);
        res.status(500).json({ error: e.message });
    }
};
