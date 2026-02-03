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
            const { is_active, entity_type } = req.query;
            
            let query = supabase
                .from('notification_rules')
                .select('*')
                .order('entity_type')
                .order('name');
            
            if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
            if (entity_type) query = query.eq('entity_type', entity_type);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { 
                name, description, entity_type, field_name,
                condition_type, days_before, priority,
                notification_title, notification_message, is_active
            } = req.body;
            
            if (!name || !entity_type || !field_name || !condition_type) {
                return res.status(400).json({ error: 'Povinné polia: name, entity_type, field_name, condition_type' });
            }
            
            const { data, error } = await supabase
                .from('notification_rules')
                .insert({
                    name,
                    description,
                    entity_type,
                    field_name,
                    condition_type,
                    days_before: days_before || 30,
                    priority: priority || 'normal',
                    notification_title,
                    notification_message,
                    is_active: is_active !== false
                })
                .select()
                .single();
            
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Notification rules API error:', e);
        res.status(500).json({ error: e.message });
    }
};
