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
    
    // Filter podľa role - gt '' znamená "väčší ako prázdny string" = neprázdny
    if (role === 'judge') {
      query = query.gt('judge_license', '');
    } else if (role === 'trainer') {
      query = query.gt('trainer_license', '');
    } else if (role === 'builder') {
      query = query.gt('course_builder_license', '');
    } else if (role === 'steward') {
      query = query.gt('steward_license', '');
    }
    
    if (region) query = query.eq('region', region);
    if (status) query = query.eq('sjf_license_status', status);
    if (search) query = query.or(`surname.ilike.%${search}%,first_name.ilike.%${search}%,club_name.ilike.%${search}%`);
    
    query = query.limit(500);
    
    const { data, error } = await query;
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
