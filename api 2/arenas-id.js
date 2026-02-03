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
            const { data: arena, error } = await supabase
                .from('arenas')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            
            // Načítaj aj rozvrhy
            const { data: schedules } = await supabase
                .from('arena_schedules')
                .select('*')
                .eq('arena_id', id)
                .order('day_of_week');
            arena.schedules = schedules || [];
            
            return res.status(200).json(arena);
        }

        if (req.method === 'PUT') {
            const { schedules, ...updates } = req.body;
            
            const { data, error } = await supabase
                .from('arenas')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            
            // Ak sú zadané rozvrhy, nahraď ich
            if (schedules) {
                await supabase.from('arena_schedules').delete().eq('arena_id', id);
                if (schedules.length > 0) {
                    const schedulesWithArenaId = schedules.map(s => ({
                        ...s,
                        arena_id: parseInt(id)
                    }));
                    await supabase.from('arena_schedules').insert(schedulesWithArenaId);
                }
            }
            
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('arenas').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Arenas-ID API error:', e);
        res.status(500).json({ error: e.message });
    }
};
