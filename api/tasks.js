const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Neautorizovany' });

    try {
        if (req.method === 'GET') {
            const { status, priority, horse_id, due_filter, assigned_to, limit } = req.query;
            
            let query = supabase
                .from('tasks')
                .select('*')
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });
            
            if (status && status !== 'all') {
                if (status === 'active') {
                    query = query.in('status', ['open', 'in_progress']);
                } else {
                    query = query.eq('status', status);
                }
            }
            if (priority && priority !== 'all') query = query.eq('priority', priority);
            if (horse_id) query = query.eq('horse_id', horse_id);
            if (assigned_to) query = query.eq('assigned_to', assigned_to);
            
            if (due_filter) {
                const today = new Date().toISOString().split('T')[0];
                const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                
                if (due_filter === 'today') {
                    query = query.eq('due_date', today);
                } else if (due_filter === 'overdue') {
                    query = query.lt('due_date', today).in('status', ['open', 'in_progress']);
                } else if (due_filter === 'week') {
                    query = query.lte('due_date', in7days).gte('due_date', today);
                }
            }
            
            if (limit) query = query.limit(parseInt(limit));
            
            const { data: tasks, error } = await query;
            
            // Ak tabulka neexistuje alebo iny DB error, vrat prazdne pole
            if (error) {
                console.error('Tasks GET error:', error.code, error.message);
                // Graceful handling - vrat prazdne pole namiesto 500
                return res.status(200).json([]);
            }
            
            // Fetch horse names separately if needed
            const horseIds = [...new Set((tasks || []).filter(t => t.horse_id).map(t => t.horse_id))];
            let horsesMap = {};
            if (horseIds.length > 0) {
                const { data: horses } = await supabase
                    .from('horses')
                    .select('id, name, stable_name')
                    .in('id', horseIds);
                horsesMap = (horses || []).reduce((acc, h) => { acc[h.id] = h; return acc; }, {});
            }
            
            // Merge horse data
            const result = (tasks || []).map(t => ({
                ...t,
                horses: t.horse_id ? horsesMap[t.horse_id] || null : null
            }));
            
            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            const { title, description, priority, status, due_date, horse_id, entity_type, entity_id, assigned_to } = req.body;
            
            if (!title) {
                return res.status(400).json({ error: 'Nazov ulohy je povinny' });
            }
            
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    title,
                    description: description || null,
                    priority: priority || 'normal',
                    status: status || 'open',
                    due_date: due_date || null,
                    horse_id: horse_id || null,
                    entity_type: entity_type || null,
                    entity_id: entity_id || null,
                    assigned_to: assigned_to || null,
                    created_by: user.id || null
                })
                .select('*')
                .single();
            
            if (error) {
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    return res.status(400).json({ error: 'Tabulka tasks neexistuje. Spusti migracny SQL.' });
                }
                throw error;
            }
            
            // Fetch horse if exists
            if (data && data.horse_id) {
                const { data: horse } = await supabase
                    .from('horses')
                    .select('id, name, stable_name')
                    .eq('id', data.horse_id)
                    .single();
                data.horses = horse || null;
            }
            
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Tasks API error:', e);
        res.status(500).json({ error: e.message });
    }
};
