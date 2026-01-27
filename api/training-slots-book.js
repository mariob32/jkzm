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

    const slotId = req.query.id;
    if (!slotId) return res.status(400).json({ error: 'Slot ID is required' });

    const { horse_id, rider_id } = req.body;
    if (!horse_id || !rider_id) {
        return res.status(400).json({ error: 'horse_id a rider_id sú povinné' });
    }

    const { ip, user_agent } = getRequestInfo(req);

    try {
        // 1. Check slot exists and is open
        const { data: slot, error: slotError } = await supabase
            .from('training_slots')
            .select('*')
            .eq('id', slotId)
            .single();

        if (slotError || !slot) {
            return res.status(404).json({ error: 'Slot nenájdený' });
        }

        if (slot.status !== 'open') {
            return res.status(400).json({ error: `Slot nie je otvorený (status: ${slot.status})` });
        }

        // 2. Check capacity
        const { count: bookedCount } = await supabase
            .from('training_bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', slotId)
            .eq('status', 'booked');

        if (bookedCount >= slot.capacity) {
            return res.status(400).json({ error: `Slot je plný (${bookedCount}/${slot.capacity})` });
        }

        // 3. Check duplicate booking
        const { data: existing } = await supabase
            .from('training_bookings')
            .select('id')
            .eq('slot_id', slotId)
            .eq('horse_id', horse_id)
            .eq('rider_id', rider_id)
            .neq('status', 'cancelled')
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'Táto kombinácia kôň+jazdec už má rezerváciu na tento slot' });
        }

        // 4. Create booking
        const { data: booking, error: bookingError } = await supabase
            .from('training_bookings')
            .insert([{
                slot_id: slotId,
                horse_id,
                rider_id,
                created_by_actor_id: user.id || null,
                status: 'booked'
            }])
            .select()
            .single();

        if (bookingError) throw bookingError;

        // 5. Audit log
        await logAudit(supabase, {
            action: 'book',
            entity_type: 'training-slot',
            entity_id: slotId,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: { capacity: slot.capacity, booked: bookedCount },
            after_data: booking
        });

        return res.status(201).json(booking);
    } catch (error) {
        console.error('Training-slots-book error:', error);
        return res.status(500).json({ error: error.message });
    }
};
