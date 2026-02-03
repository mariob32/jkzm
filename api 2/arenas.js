const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { id, include_schedules } = req.query;
            
            if (id) {
                // Získaj konkrétnu arénu s rozvrhom
                const { data: arena, error } = await supabase
                    .from('arenas')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (error) throw error;
                
                if (include_schedules === 'true') {
                    const { data: schedules } = await supabase
                        .from('arena_schedules')
                        .select('*')
                        .eq('arena_id', id)
                        .order('day_of_week');
                    arena.schedules = schedules || [];
                }
                
                return res.status(200).json(arena);
            }
            
            // Zoznam arén
            let query = supabase.from('arenas').select('*').order('name');
            if (req.query.active === 'true') query = query.eq('is_active', true);
            
            const { data, error } = await query;
            if (error) throw error;
            
            // Ak chceme aj rozvrhy
            if (include_schedules === 'true') {
                for (let arena of data) {
                    const { data: schedules } = await supabase
                        .from('arena_schedules')
                        .select('*')
                        .eq('arena_id', arena.id)
                        .order('day_of_week');
                    arena.schedules = schedules || [];
                }
            }
            
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { name, description, capacity, is_indoor, schedules } = req.body;
            
            // Vytvor arénu
            const { data: arena, error } = await supabase
                .from('arenas')
                .insert({ name, description, capacity: capacity || 4, is_indoor: is_indoor || false })
                .select()
                .single();
            if (error) throw error;
            
            // Ak sú zadané rozvrhy, pridaj ich
            if (schedules && schedules.length > 0) {
                const schedulesWithArenaId = schedules.map(s => ({
                    ...s,
                    arena_id: arena.id
                }));
                await supabase.from('arena_schedules').insert(schedulesWithArenaId);
            }
            
            return res.status(201).json(arena);
        }

        if (req.method === 'PUT') {
            const { id, schedules, ...updates } = req.body;
            if (!id) return res.status(400).json({ error: 'ID required' });
            
            // Update arénu
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
                        arena_id: id
                    }));
                    await supabase.from('arena_schedules').insert(schedulesWithArenaId);
                }
            }
            
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID required' });
            
            const { error } = await supabase.from('arenas').delete().eq('id', id);
            if (error) throw error;
            
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Arenas API error:', e);
        res.status(500).json({ error: e.message });
    }
};
