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
            const { from, to, entity_type, action, actor_name, entity_id, limit } = req.query;
            
            let query = supabase
                .from('audit_logs')
                .select('id, created_at, action, entity_type, entity_id, actor_name, actor_id, ip, user_agent, diff', { count: 'exact' })
                .order('created_at', { ascending: false });
            
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to + 'T23:59:59');
            if (entity_type && entity_type !== 'all') query = query.eq('entity_type', entity_type);
            if (action && action !== 'all') query = query.eq('action', action);
            if (entity_id) query = query.eq('entity_id', entity_id);
            if (actor_name) query = query.ilike('actor_name', `%${actor_name}%`);
            
            const limitNum = Math.min(parseInt(limit) || 100, 500);
            query = query.limit(limitNum);
            
            const { data, error, count } = await query;
            
            if (error) {
                console.error('Audit logs GET error:', error.message);
                return res.status(200).json({ data: [], total: 0 });
            }
            
            return res.status(200).json({ data: data || [], total: count || 0 });
        }

        if (req.method === 'POST') {
            const { entity_type, entity_id, action, actor_id, actor_name, ip, user_agent, before_data, after_data, diff } = req.body;
            
            if (!entity_type || !action) {
                return res.status(400).json({ error: 'entity_type a action su povinne' });
            }
            
            const { data, error } = await supabase
                .from('audit_logs')
                .insert({
                    entity_type,
                    entity_id: entity_id || null,
                    action,
                    actor_id: actor_id || null,
                    actor_name: actor_name || 'admin',
                    ip: ip || null,
                    user_agent: user_agent || null,
                    before_data: before_data || null,
                    after_data: after_data || null,
                    diff: diff || null
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
