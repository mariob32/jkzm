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
            const { from, to, entity_type, action, changed_by, q, limit, offset } = req.query;
            
            let query = supabase
                .from('audit_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });
            
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to + 'T23:59:59');
            if (entity_type) query = query.eq('entity_type', entity_type);
            if (action) query = query.eq('action', action);
            if (changed_by) query = query.eq('changed_by', changed_by);
            if (q) {
                query = query.or(`entity_id.eq.${q},changed_by_name.ilike.%${q}%`);
            }
            
            const limitNum = parseInt(limit) || 50;
            const offsetNum = parseInt(offset) || 0;
            query = query.range(offsetNum, offsetNum + limitNum - 1);
            
            const { data, error, count } = await query;
            if (error) throw error;
            
            return res.status(200).json({ data: data || [], total: count || 0 });
        }

        if (req.method === 'POST') {
            const { entity_type, entity_id, action, changed_by, changed_by_name, before_data, after_data, changed_fields } = req.body;
            
            if (!entity_type || !entity_id || !action) {
                return res.status(400).json({ error: 'entity_type, entity_id a action su povinne' });
            }
            
            const { data, error } = await supabase
                .from('audit_logs')
                .insert({
                    entity_type,
                    entity_id,
                    action,
                    changed_by: changed_by || null,
                    changed_by_name: changed_by_name || null,
                    before_data: before_data || null,
                    after_data: after_data || null,
                    changed_fields: changed_fields || null
                })
                .select()
                .single();
            
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Audit logs API error:', e);
        res.status(500).json({ error: e.message });
    }
};
