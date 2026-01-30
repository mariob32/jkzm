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
            .select('amount_cents, paid_method')
            .eq('status', 'paid')
            .gte('paid_at', `${fromDate}T00:00:00`)
            .lte('paid_at', `${toDate}T23:59:59`);

        if (error) throw error;

        // Calculate totals by method
        const totals_by_method = {
            cash: 0,
            card: 0,
            bank: 0,
            other: 0
        };

        let total_paid_cents = 0;

        for (const charge of charges || []) {
            const method = charge.paid_method || 'other';
            const amount = charge.amount_cents || 0;
            
            if (totals_by_method.hasOwnProperty(method)) {
                totals_by_method[method] += amount;
            } else {
                totals_by_method.other += amount;
            }
            
            total_paid_cents += amount;
        }

        return res.status(200).json({
            from: fromDate,
            to: toDate,
            totals_by_method,
            total_paid_cents,
            count_paid: (charges || []).length
        });

    } catch (err) {
        console.error('Cashdesk summary error:', err);
        return res.status(500).json({ error: err.message });
    }
};
