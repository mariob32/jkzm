const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    // GET
    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) return res.status(404).json({ error: 'Competition not found' });
        return res.json(data);
    }

    // PUT
    if (req.method === 'PUT') {
        const { data, error } = await supabase
            .from('competitions')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();
        
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
    }

    // DELETE
    if (req.method === 'DELETE') {
        const { error } = await supabase
            .from('competitions')
            .delete()
            .eq('id', id);
        
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
