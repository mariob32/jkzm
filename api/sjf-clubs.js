const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { status, region, school, search } = req.query;
    
    let query = supabase
      .from('sjf_clubs')
      .select('*')
      .order('name');
    
    if (status) query = query.eq('status', status);
    if (region) query = query.eq('region', region);
    if (school === 'true') query = query.eq('is_riding_school', true);
    if (search) query = query.ilike('name', `%${search}%`);
    
    const { data, error } = await query;
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
