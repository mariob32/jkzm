const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { role, region, status, search } = req.query;
    
    let query = supabase
      .from('sjf_persons')
      .select('*')
      .order('surname');
    
    // Filter podľa role (voliteľný)
    if (role === 'judge') {
      query = query.not('judge_license', 'is', null);
    } else if (role === 'trainer') {
      query = query.not('trainer_license', 'is', null);
    } else if (role === 'builder') {
      query = query.not('course_builder_license', 'is', null);
    } else if (role === 'steward') {
      query = query.not('steward_license', 'is', null);
    }
    
    if (region) query = query.eq('region', region);
    if (status) query = query.eq('sjf_license_status', status);
    if (search) query = query.or(`surname.ilike.%${search}%,first_name.ilike.%${search}%,club_name.ilike.%${search}%`);
    
    // Limit výsledkov
    query = query.limit(500);
    
    const { data, error } = await query;
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
