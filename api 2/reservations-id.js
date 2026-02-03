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
                .from('reservations')
                .select('*, arenas(name)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const updates = req.body;
            
            // Ak sa mení status
            if (updates.status === 'confirmed') {
                updates.confirmed_at = new Date().toISOString();
            }
            if (updates.status === 'cancelled') {
                updates.cancelled_at = new Date().toISOString();
            }
            updates.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('reservations')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase.from('reservations').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Reservations-ID API error:', e);
        res.status(500).json({ error: e.message });
    }
};
