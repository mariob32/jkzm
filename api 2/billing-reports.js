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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Parse params
        let { from, to, status = 'unpaid', include } = req.query;

        // Default: last 30 days
        const now = new Date();
        const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const fromDate = from || defaultFrom.toISOString().split('T')[0];
        const toDate = to || now.toISOString().split('T')[0];

        // Build base query
        let query = supabase
            .from('billing_charges')
            .select('*')
            .gte('created_at', fromDate)
            .lte('created_at', toDate + 'T23:59:59');

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: charges, error } = await query;
        if (error) throw error;

        // Calculate summary
        const summary = {
            total_count: charges.length,
            total_cents: charges.reduce((sum, c) => sum + c.amount_cents, 0),
            by_status: {},
            by_method: {},
            by_discipline: {},
            by_rider_top: []
        };

        // By status
        charges.forEach(c => {
            summary.by_status[c.status] = (summary.by_status[c.status] || 0) + c.amount_cents;
        });

        // By payment method (only for paid)
        charges.filter(c => c.status === 'paid').forEach(c => {
            const method = c.paid_method || 'unknown';
            summary.by_method[method] = (summary.by_method[method] || 0) + c.amount_cents;
        });

        // By discipline - need to fetch trainings
        const trainingIds = [...new Set(charges.filter(c => c.training_id).map(c => c.training_id))];
        let disciplineMap = {};
        
        if (trainingIds.length > 0) {
            const { data: trainings } = await supabase
                .from('trainings')
                .select('id, discipline')
                .in('id', trainingIds);
            
            if (trainings) {
                trainings.forEach(t => disciplineMap[t.id] = t.discipline || 'unknown');
            }
        }

        charges.forEach(c => {
            const disc = disciplineMap[c.training_id] || 'other';
            summary.by_discipline[disc] = (summary.by_discipline[disc] || 0) + c.amount_cents;
        });

        // Top riders
        const riderTotals = {};
        charges.forEach(c => {
            if (c.rider_id) {
                riderTotals[c.rider_id] = (riderTotals[c.rider_id] || 0) + c.amount_cents;
            }
        });

        const riderIds = Object.keys(riderTotals);
        let ridersMap = {};
        
        if (riderIds.length > 0) {
            const { data: riders } = await supabase
                .from('riders')
                .select('id, first_name, last_name')
                .in('id', riderIds);
            
            if (riders) {
                riders.forEach(r => ridersMap[r.id] = r);
            }
        }

        summary.by_rider_top = Object.entries(riderTotals)
            .map(([id, cents]) => ({
                rider_id: id,
                rider_name: ridersMap[id] 
                    ? `${ridersMap[id].first_name || ''} ${ridersMap[id].last_name || ''}`.trim() 
                    : 'Unknown',
                total_cents: cents
            }))
            .sort((a, b) => b.total_cents - a.total_cents)
            .slice(0, 10);

        // Response
        const response = {
            period: { from: fromDate, to: toDate },
            status_filter: status,
            summary
        };

        // Include rows if requested
        if (include === 'rows') {
            // Enrich with rider/horse names
            const allRiderIds = [...new Set(charges.filter(c => c.rider_id).map(c => c.rider_id))];
            const allHorseIds = [...new Set(charges.filter(c => c.horse_id).map(c => c.horse_id))];

            let allRidersMap = {}, allHorsesMap = {};

            if (allRiderIds.length > 0) {
                const { data: riders } = await supabase.from('riders').select('id, first_name, last_name').in('id', allRiderIds);
                if (riders) riders.forEach(r => allRidersMap[r.id] = r);
            }
            if (allHorseIds.length > 0) {
                const { data: horses } = await supabase.from('horses').select('id, name').in('id', allHorseIds);
                if (horses) horses.forEach(h => allHorsesMap[h.id] = h);
            }

            response.data = charges.map(c => ({
                ...c,
                rider: allRidersMap[c.rider_id] || null,
                horse: allHorsesMap[c.horse_id] || null,
                discipline: disciplineMap[c.training_id] || null
            }));
        }

        return res.status(200).json(response);
    } catch (error) {
        console.error('Billing-reports error:', error);
        return res.status(500).json({ error: error.message });
    }
};
