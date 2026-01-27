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

    const { status } = req.body;
    if (!status || !['attended', 'no_show'].includes(status)) {
        return res.status(400).json({ error: 'status musí byť "attended" alebo "no_show"' });
    }

    const { ip, user_agent } = getRequestInfo(req);

    try {
        // Get booking with slot info
        const { data: booking, error: fetchError } = await supabase
            .from('training_bookings')
            .select(`
                *,
                slot:training_slots(*)
            `)
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ error: 'Rezervácia nenájdená' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ error: 'Zrušenú rezerváciu nie je možné označiť' });
        }

        const before = { ...booking };
        delete before.slot;

        // Update booking status
        const { data: after, error: updateError } = await supabase
            .from('training_bookings')
            .update({ status })
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Audit booking mark
        await logAudit(supabase, {
            action: 'mark',
            entity_type: 'training-booking',
            entity_id: bookingId,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: before,
            after_data: after
        });

        let createdTraining = null;

        // If attended, create training record
        if (status === 'attended' && booking.slot) {
            const slot = booking.slot;
            
            const trainingData = {
                training_date: slot.slot_date,
                date: slot.slot_date,
                start_time: slot.start_time,
                duration_min: slot.duration_min,
                discipline: slot.discipline,
                horse_id: booking.horse_id,
                rider_id: booking.rider_id,
                trainer_id: slot.trainer_id,
                notes: `Z rezervácie: ${bookingId}`,
                status: 'completed'
            };

            const { data: training, error: trainingError } = await supabase
                .from('trainings')
                .insert([trainingData])
                .select()
                .single();

            if (trainingError) {
                console.error('Failed to create training:', trainingError);
                // Don't fail the whole operation, just log it
            } else {
                createdTraining = training;

                // Audit training creation
                await logAudit(supabase, {
                    action: 'create',
                    entity_type: 'training',
                    entity_id: training.id,
                    actor_id: user.id || null,
                    actor_name: user.email || user.name || 'admin',
                    ip,
                    user_agent,
                    before_data: null,
                    after_data: training
                });
            }
        }

        return res.status(200).json({
            booking: after,
            training: createdTraining
        });
    } catch (error) {
        console.error('Training-bookings-mark error:', error);
        return res.status(500).json({ error: error.message });
    }
};
