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

    if (!verifyToken(req)) return res.status(401).json({ error: 'Neautorizovaný' });

    try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const today = new Date().toISOString().split('T')[0];

        const { count: horsesCount } = await supabase.from('horses').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { count: ridersCount } = await supabase.from('riders').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { count: trainingsToday } = await supabase.from('trainings').select('*', { count: 'exact', head: true }).eq('date', today);
        const { data: payments } = await supabase.from('payments').select('amount')
            .gte('payment_date', `${currentMonth}-01`).eq('status', 'paid');
        const revenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
        const { count: pendingBookings } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'new');
        const { count: newMessages } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'new');
        
        // Upozornenia - blížiace sa očkovania a expirácie
        const { count: alerts } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('status', 'pending');

        res.status(200).json({
            horses: { total: horsesCount || 0 },
            riders: { total: ridersCount || 0 },
            trainings: { today: trainingsToday || 0 },
            revenue: { thisMonth: revenue },
            pendingBookings: pendingBookings || 0,
            newMessages: newMessages || 0,
            alerts: alerts || 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
