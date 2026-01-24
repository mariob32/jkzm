const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID required' });

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('notifications')
                .select('*, trainers(first_name, last_name), horses(name)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const updates = req.body;
            
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
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Notifications-ID API error:', e);
        res.status(500).json({ error: e.message });
    }
};
