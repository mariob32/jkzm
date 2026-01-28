const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logAudit, getRequestInfo } = require('./utils/audit');
const { computeCharge } = require('./utils/pricing');

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
        // 1. Load booking with slot info
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

        const slot = booking.slot;
        const beforeData = { ...booking };
        delete beforeData.slot;

        // 2. Handle NO_SHOW
        if (status === 'no_show') {
            const { data: afterData, error: updateError } = await supabase
                .from('training_bookings')
                .update({ 
                    status: 'no_show',
                    marked_at: new Date().toISOString()
                })
                .eq('id', bookingId)
                .select()
                .single();

            if (updateError) throw updateError;

            await logAudit(supabase, {
                action: 'mark',
                entity_type: 'training-booking',
                entity_id: bookingId,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: beforeData,
                after_data: afterData
            });

            return res.status(200).json({ booking: afterData, training: null });
        }

        // 3. Handle ATTENDED
        let training = null;

        // 3a. Check if already linked to training
        if (booking.training_id) {
            const { data: existingTraining } = await supabase
                .from('trainings')
                .select('*')
                .eq('id', booking.training_id)
                .single();

            if (existingTraining) {
                training = existingTraining;
            }
        }

        // 3b. Check if training exists by source_booking_id
        if (!training) {
            const { data: existingBySource } = await supabase
                .from('trainings')
                .select('*')
                .eq('source_booking_id', bookingId)
                .single();

            if (existingBySource) {
                training = existingBySource;
            }
        }

        // 3c. Create training if not exists
        if (!training) {
            // Check which date column exists
            const trainingData = {
                horse_id: booking.horse_id,
                rider_id: booking.rider_id,
                trainer_id: slot?.trainer_id || null,
                duration_min: slot?.duration_min || 60,
                discipline: slot?.discipline || null,
                intensity: null,
                goals: null,
                start_time: slot?.start_time || null,
                source_booking_id: bookingId,
                status: 'completed'
            };

            // Add date - try training_date first, then date
            if (slot?.slot_date) {
                trainingData.training_date = slot.slot_date;
                trainingData.date = slot.slot_date;
            }

            const { data: newTraining, error: trainingError } = await supabase
                .from('trainings')
                .insert([trainingData])
                .select()
                .single();

            if (trainingError) {
                console.error('Training create error:', trainingError);
                return res.status(500).json({ 
                    error: 'training_create_failed', 
                    detail: trainingError.message,
                    booking_id: bookingId
                });
            }

            training = newTraining;

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

        // 4. Update booking with training_id and status
        const { data: afterData, error: updateError } = await supabase
            .from('training_bookings')
            .update({ 
                status: 'attended',
                marked_at: new Date().toISOString(),
                training_id: training.id
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) throw updateError;

        // 5. Create or get billing charge (idempotent)
        let charge = null;
        
        // Check if charge already exists by booking_id or training_id
        const { data: existingCharge } = await supabase
            .from('billing_charges')
            .select('*')
            .or(`booking_id.eq.${bookingId},training_id.eq.${training.id}`)
            .limit(1)
            .single();

        if (existingCharge) {
            charge = existingCharge;
        } else {
            // Compute charge using pricing rules
            const discipline = training.discipline || slot?.discipline || null;
            const durationMin = training.duration_min || training.duration_minutes || slot?.duration_min || 60;
            
            const computed = await computeCharge(supabase, {
                discipline,
                duration_min: durationMin,
                rider_id: booking.rider_id,
                horse_id: booking.horse_id,
                currency: 'EUR'
            });

            const chargeData = {
                training_id: training.id,
                booking_id: bookingId,
                rider_id: booking.rider_id,
                horse_id: booking.horse_id,
                amount_cents: computed.amount_cents,
                currency: 'EUR',
                status: 'unpaid',
                pricing_rule_id: computed.pricing_rule_id,
                computed_details: computed.computed_details
            };

            const { data: newCharge, error: chargeError } = await supabase
                .from('billing_charges')
                .insert([chargeData])
                .select()
                .single();

            if (chargeError) {
                console.error('Charge create error:', chargeError);
                return res.status(500).json({
                    error: 'charge_create_failed',
                    detail: chargeError.message,
                    booking_id: bookingId
                });
            }

            charge = newCharge;

            // Audit charge creation
            await logAudit(supabase, {
                action: 'create',
                entity_type: 'billing-charge',
                entity_id: charge.id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: null,
                after_data: charge
            });
        }

        // 6. Update training with billing info
        if (charge) {
            await supabase
                .from('trainings')
                .update({
                    billing_status: charge.status,
                    billing_charge_id: charge.id
                })
                .eq('id', training.id);
            
            // Refresh training data
            const { data: updatedTraining } = await supabase
                .from('trainings')
                .select('*')
                .eq('id', training.id)
                .single();
            
            if (updatedTraining) {
                training = updatedTraining;
            }
        }

        // 7. Audit booking mark
        await logAudit(supabase, {
            action: 'mark',
            entity_type: 'training-booking',
            entity_id: bookingId,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: beforeData,
            after_data: afterData
        });

        return res.status(200).json({
            booking: afterData,
            training: training,
            charge: charge
        });

    } catch (error) {
        console.error('Training-bookings-mark error:', error);
        return res.status(500).json({ error: error.message });
    }
};
