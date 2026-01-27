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
        let { from, to } = req.query;

        // Default: this week (Monday to Sunday)
        if (!from) {
            const now = new Date();
            const monday = new Date(now);
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            monday.setDate(now.getDate() + diff);
            from = monday.toISOString().split('T')[0];
        }
        if (!to) {
            const fromDate = new Date(from);
            const sunday = new Date(fromDate);
            sunday.setDate(fromDate.getDate() + 6);
            to = sunday.toISOString().split('T')[0];
        }

        // Get slots with bookings
        const { data: slots, error } = await supabase
            .from('training_slots')
            .select(`
                *,
                trainer:riders!training_slots_trainer_id_fkey(id, first_name, last_name),
                bookings:training_bookings(
                    id, status, created_at, cancelled_at, cancel_reason, training_id, marked_at,
                    horse:horses(id, name),
                    rider:riders!training_bookings_rider_id_fkey(id, first_name, last_name)
                )
            `)
            .gte('slot_date', from)
            .lte('slot_date', to)
            .order('slot_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Calculate totals
        let totalSlots = slots.length;
        let totalBookings = 0;
        let openSlots = 0;
        let fullyBooked = 0;

        const enrichedSlots = slots.map(slot => {
            const activeBookings = (slot.bookings || []).filter(b => b.status === 'booked' || b.status === 'attended');
            const bookedCount = activeBookings.length;
            totalBookings += bookedCount;

            if (slot.status === 'open') {
                openSlots++;
                if (bookedCount >= slot.capacity) {
                    fullyBooked++;
                }
            }

            return {
                ...slot,
                booked_count: bookedCount,
                available: slot.capacity - bookedCount,
                is_full: bookedCount >= slot.capacity
            };
        });

        // Group by date for calendar view
        const byDate = {};
        enrichedSlots.forEach(slot => {
            if (!byDate[slot.slot_date]) {
                byDate[slot.slot_date] = [];
            }
            byDate[slot.slot_date].push(slot);
        });

        return res.status(200).json({
            from,
            to,
            slots: enrichedSlots,
            by_date: byDate,
            summary: {
                total_slots: totalSlots,
                total_bookings: totalBookings,
                open_slots: openSlots,
                fully_booked: fullyBooked
            }
        });
    } catch (error) {
        console.error('Training-calendar error:', error);
        return res.status(500).json({ error: error.message });
    }
};
