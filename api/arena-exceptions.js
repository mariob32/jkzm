const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { arena_id, date_from, date_to, id } = req.query;
            
            if (id) {
                const { data, error } = await supabase
                    .from('arena_exceptions')
                    .select('*, arenas(name)')
                    .eq('id', id)
                    .single();
                if (error) throw error;
                return res.status(200).json(data);
            }
            
            let query = supabase
                .from('arena_exceptions')
                .select('*, arenas(name)')
                .order('exception_date', { ascending: true });
            
            if (arena_id) query = query.eq('arena_id', arena_id);
            if (date_from) query = query.gte('exception_date', date_from);
            if (date_to) query = query.lte('exception_date', date_to);
            
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { 
                arena_id, exception_date, is_closed,
                open_time, close_time, reason 
            } = req.body;
            
            if (!arena_id || !exception_date) {
                return res.status(400).json({ error: 'arena_id a exception_date sú povinné' });
            }
            
            const { data, error } = await supabase
                .from('arena_exceptions')
                .insert({
                    arena_id,
                    exception_date,
                    is_closed: is_closed !== false,
                    open_time,
                    close_time,
                    reason
                })
                .select()
                .single();
            if (error) throw error;
            return res.status(201).json(data);
        }

        if (req.method === 'PUT') {
            const { id, ...updates } = req.body;
            if (!id) return res.status(400).json({ error: 'ID required' });
            
            const { data, error } = await supabase
                .from('arena_exceptions')
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
            
            const { error } = await supabase.from('arena_exceptions').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Arena-Exceptions API error:', e);
        res.status(500).json({ error: e.message });
    }
};
