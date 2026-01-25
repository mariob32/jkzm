const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verejný endpoint - vráti len základné údaje aktívnych členov
        const { data, error } = await supabase
            .from('riders')
            .select('id, first_name, last_name, phone, email, skill_level')
            .eq('status', 'active')
            .order('last_name')
            .order('first_name');
        
        if (error) throw error;
        
        return res.status(200).json(data || []);
    } catch (error) {
        console.error('Members public API error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
