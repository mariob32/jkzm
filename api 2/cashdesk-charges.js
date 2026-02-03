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
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { from, to } = req.query;
        
        // Default to today if not specified
        const today = new Date().toISOString().split('T')[0];
        const fromDate = from || today;
        const toDate = to || today;

        // Get all paid charges in date range
        const { data: charges, error } = await supabase
            .from('billing_charges')
            .select('id, created_at, paid_at, amount_cents, currency, paid_method, paid_reference, reference_code, note, training_id, booking_id, rider_id, horse_id')
            .eq('status', 'paid')
            .gte('paid_at', `${fromDate}T00:00:00`)
            .lte('paid_at', `${toDate}T23:59:59`)
            .order('paid_at', { ascending: false });

        if (error) throw error;

        // Get unique rider and horse IDs
        const riderIds = [...new Set((charges || []).map(c => c.rider_id).filter(Boolean))];
        const horseIds = [...new Set((charges || []).map(c => c.horse_id).filter(Boolean))];

        // Fetch riders and horses separately
        let ridersMap = {};
        let horsesMap = {};

        if (riderIds.length > 0) {
            const { data: riders } = await supabase
                .from('riders')
                .select('id, first_name, last_name')
                .in('id', riderIds);
            
            for (const r of riders || []) {
                ridersMap[r.id] = r;
            }
        }

        if (horseIds.length > 0) {
            const { data: horses } = await supabase
                .from('horses')
                .select('id, name')
                .in('id', horseIds);
            
            for (const h of horses || []) {
                horsesMap[h.id] = h;
            }
        }

        // Format response
        const formattedCharges = (charges || []).map(c => {
            const rider = ridersMap[c.rider_id];
            const horse = horsesMap[c.horse_id];
            
            return {
                id: c.id,
                created_at: c.created_at,
                paid_at: c.paid_at,
                amount_cents: c.amount_cents,
                currency: c.currency || 'EUR',
                paid_method: c.paid_method,
                paid_reference: c.paid_reference,
                reference_code: c.reference_code,
                note: c.note,
                training_id: c.training_id,
                booking_id: c.booking_id,
                rider: rider ? {
                    id: rider.id,
                    first_name: rider.first_name,
                    last_name: rider.last_name,
                    full_name: `${rider.first_name || ''} ${rider.last_name || ''}`.trim()
                } : null,
                horse: horse ? {
                    id: horse.id,
                    name: horse.name
                } : null
            };
        });

        return res.status(200).json({
            from: fromDate,
            to: toDate,
            count: formattedCharges.length,
            charges: formattedCharges
        });

    } catch (err) {
        console.error('Cashdesk charges error:', err);
        return res.status(500).json({ error: err.message });
    }
};
