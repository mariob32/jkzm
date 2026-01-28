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
            let { 
                status = 'unpaid', 
                rider_id, 
                horse_id, 
                from,
                to,
                q,
                limit = 100, 
                offset = 0 
            } = req.query;

            // First get all charges for filtering
            let query = supabase
                .from('billing_charges')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            // Status filter
            if (status && status !== 'all') {
                query = query.eq('status', status);
            }
            if (rider_id) query = query.eq('rider_id', rider_id);
            if (horse_id) query = query.eq('horse_id', horse_id);

            // Date filter
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to + 'T23:59:59');

            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            // Fetch related data manually
            const riderIds = [...new Set(data.filter(c => c.rider_id).map(c => c.rider_id))];
            const horseIds = [...new Set(data.filter(c => c.horse_id).map(c => c.horse_id))];
            const trainingIds = [...new Set(data.filter(c => c.training_id).map(c => c.training_id))];

            let ridersMap = {}, horsesMap = {}, trainingsMap = {};

            if (riderIds.length > 0) {
                const { data: riders } = await supabase.from('riders').select('id, first_name, last_name').in('id', riderIds);
                if (riders) riders.forEach(r => ridersMap[r.id] = r);
            }
            if (horseIds.length > 0) {
                const { data: horses } = await supabase.from('horses').select('id, name').in('id', horseIds);
                if (horses) horses.forEach(h => horsesMap[h.id] = h);
            }
            if (trainingIds.length > 0) {
                const { data: trainings } = await supabase.from('trainings').select('id, training_date, date, discipline').in('id', trainingIds);
                if (trainings) trainings.forEach(t => trainingsMap[t.id] = t);
            }

            // Enrich data
            let enrichedData = data.map(c => ({
                ...c,
                rider: ridersMap[c.rider_id] || null,
                horse: horsesMap[c.horse_id] || null,
                training: trainingsMap[c.training_id] || null
            }));

            // Search filter (q) - filter by rider name, horse name, note, reference_code
            if (q && q.trim()) {
                const searchTerm = q.trim().toLowerCase();
                enrichedData = enrichedData.filter(c => {
                    const riderName = c.rider ? `${c.rider.first_name || ''} ${c.rider.last_name || ''}`.toLowerCase() : '';
                    const horseName = c.horse?.name?.toLowerCase() || '';
                    const note = c.note?.toLowerCase() || '';
                    const refCode = c.reference_code?.toLowerCase() || '';
                    const paidRef = c.paid_reference?.toLowerCase() || '';
                    return riderName.includes(searchTerm) || 
                           horseName.includes(searchTerm) || 
                           note.includes(searchTerm) ||
                           refCode.includes(searchTerm) ||
                           paidRef.includes(searchTerm);
                });
            }

            // Calculate counts and totals
            const unpaidItems = enrichedData.filter(c => c.status === 'unpaid');
            const paidItems = enrichedData.filter(c => c.status === 'paid');
            const voidItems = enrichedData.filter(c => c.status === 'void');

            return res.status(200).json({ 
                data: enrichedData, 
                total: q ? enrichedData.length : count,
                summary: {
                    unpaid_count: unpaidItems.length,
                    unpaid_cents: unpaidItems.reduce((sum, c) => sum + c.amount_cents, 0),
                    paid_count: paidItems.length,
                    paid_cents: paidItems.reduce((sum, c) => sum + c.amount_cents, 0),
                    void_count: voidItems.length,
                    void_cents: voidItems.reduce((sum, c) => sum + c.amount_cents, 0)
                }
            });
        }

        if (req.method === 'POST') {
            const { ip, user_agent } = getRequestInfo(req);
            
            const { 
                training_id, 
                booking_id, 
                rider_id, 
                horse_id, 
                amount_cents, 
                currency = 'EUR',
                status = 'unpaid',
                due_date,
                note,
                reference_code
            } = req.body;

            if (amount_cents === undefined || amount_cents < 0) {
                return res.status(400).json({ error: 'amount_cents je povinný a musí byť >= 0' });
            }

            if (!['unpaid', 'paid', 'void'].includes(status)) {
                return res.status(400).json({ error: 'Neplatný status' });
            }

            const insertData = {
                training_id: training_id || null,
                booking_id: booking_id || null,
                rider_id: rider_id || null,
                horse_id: horse_id || null,
                amount_cents: parseInt(amount_cents),
                currency,
                status,
                due_date: due_date || null,
                note: note || null,
                reference_code: reference_code || null
            };

            const { data, error } = await supabase
                .from('billing_charges')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'create',
                entity_type: 'billing-charge',
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
        console.error('Billing-charges error:', error);
        return res.status(500).json({ error: error.message });
    }
};
