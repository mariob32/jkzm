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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const bookingId = req.query.id;
    if (!bookingId) return res.status(400).json({ error: 'Booking ID is required' });

    const { reason } = req.body;
    const { ip, user_agent } = getRequestInfo(req);

    try {
        // Get before data
        const { data: before, error: fetchError } = await supabase
            .from('training_bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (fetchError || !before) {
            return res.status(404).json({ error: 'Rezervácia nenájdená' });
        }

        if (before.status === 'cancelled') {
            return res.status(400).json({ error: 'Rezervácia už bola zrušená' });
        }

        // Update booking
        const { data: after, error: updateError } = await supabase
            .from('training_bookings')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancel_reason: reason || null
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Audit log
        await logAudit(supabase, {
            action: 'cancel',
            entity_type: 'training-booking',
            entity_id: bookingId,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: before,
            after_data: after
        });

        return res.status(200).json(after);
    } catch (error) {
        console.error('Training-bookings-cancel error:', error);
        return res.status(500).json({ error: error.message });
    }
};
