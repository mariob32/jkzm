import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
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
    
    if (error) {
      console.error('SJF Clubs error:', error);
      return res.status(500).json({ error: error.message, hint: error.hint || 'Check if table sjf_clubs exists' });
    }
    
    res.status(200).json(data || []);
  } catch (e) {
    console.error('SJF Clubs exception:', e);
    res.status(500).json({ error: e.message });
  }
}
