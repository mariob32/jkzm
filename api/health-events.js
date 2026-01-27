const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logAudit, getRequestInfo } = require('./utils/audit');

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
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (req.method === 'GET') {
            const { 
                horse_id, category, upcoming_only, upcoming_days = 30,
                limit = 50, offset = 0 
            } = req.query;

            let query = supabase
                .from('health_events')
                .select(`
                    *,
                    horse:horses(id, name)
                `, { count: 'exact' });

            if (horse_id) query = query.eq('horse_id', horse_id);
            if (category) query = query.eq('category', category);
            
            // Upcoming events filter
            if (upcoming_only === 'true' || upcoming_only === '1') {
                const today = new Date().toISOString().split('T')[0];
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + parseInt(upcoming_days));
                
                query = query
                    .gte('next_due_date', today)
                    .lte('next_due_date', futureDate.toISOString().split('T')[0])
                    .order('next_due_date', { ascending: true });
            } else {
                query = query.order('event_date', { ascending: false });
            }

            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            return res.status(200).json({ data, total: count });
        }

        if (req.method === 'POST') {
            const { ip, user_agent } = getRequestInfo(req);
            
            const { 
                event_date, horse_id, category, title,
                details, next_due_date, document_url 
            } = req.body;

            if (!event_date || !horse_id || !category || !title) {
                return res.status(400).json({ 
                    error: 'event_date, horse_id, category a title sú povinné' 
                });
            }

            const validCategories = ['vaccination', 'deworming', 'dentist', 'farrier', 'vet', 'physio', 'other'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ 
                    error: `category musí byť: ${validCategories.join(', ')}` 
                });
            }

            const insertData = {
                event_date,
                horse_id,
                category,
                title,
                details: details || null,
                next_due_date: next_due_date || null,
                document_url: document_url || null
            };

            const { data, error } = await supabase
                .from('health_events')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'create',
                entity_type: 'health-event',
                entity_id: data.id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: data
            });

            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Health-events error:', error);
        return res.status(500).json({ error: error.message });
    }
};
