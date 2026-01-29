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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const { ip, user_agent } = getRequestInfo(req);

    try {
        if (req.method === 'GET') {
            // Get slot with bookings
            const { data, error } = await supabase
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
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Slot not found' });

            // Enrich bookings with charge info - query for each booking individually
            if (data.bookings && data.bookings.length > 0) {
                const enrichedBookings = [];
                
                for (const booking of data.bookings) {
                    let charge = null;
                    
                    // Try to find charge by training_id first
                    if (booking.training_id) {
                        try {
                            const { data: chargeData, error: chargeErr } = await supabase
                                .from('billing_charges')
                                .select('id, booking_id, training_id, amount_cents, currency, status, paid_method, paid_reference, paid_at, void_reason, voided_at')
                                .eq('training_id', booking.training_id);
                            
                            if (chargeData && chargeData.length > 0) {
                                charge = chargeData[0];
                            }
                        } catch (e) {
                            console.error('Charge query error:', e);
                        }
                    }
                    
                    // If not found by training_id, try booking_id
                    if (!charge && booking.id) {
                        try {
                            const { data: chargeByBooking } = await supabase
                                .from('billing_charges')
                                .select('id, booking_id, training_id, amount_cents, currency, status, paid_method, paid_reference, paid_at, void_reason, voided_at')
                                .eq('booking_id', booking.id);
                            
                            if (chargeByBooking && chargeByBooking.length > 0) {
                                charge = chargeByBooking[0];
                            }
                        } catch (e) {
                            console.error('Charge query by booking error:', e);
                        }
                    }
                    
                    enrichedBookings.push({
                        ...booking,
                        charge: charge
                    });
                }
                
                data.bookings = enrichedBookings;
            }

            return res.status(200).json(data);
        }

        if (req.method === 'PATCH') {
            // Get before data
            const { data: before } = await supabase
                .from('training_slots')
                .select('*')
                .eq('id', id)
                .single();

            if (!before) return res.status(404).json({ error: 'Slot not found' });

            const updates = {};
            const allowedFields = ['slot_date', 'start_time', 'duration_min', 'discipline', 'capacity', 'trainer_id', 'status', 'notes'];
            
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            const { data, error } = await supabase
                .from('training_slots')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'update',
                entity_type: 'training-slot',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: data
            });

            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            // Check if slot has active bookings
            const { data: bookings } = await supabase
                .from('training_bookings')
                .select('id')
                .eq('slot_id', id)
                .in('status', ['booked', 'attended']);

            if (bookings && bookings.length > 0) {
                return res.status(400).json({ 
                    error: 'Slot má aktívne rezervácie. Najprv ich zrušte alebo zmeňte status slotu na cancelled.' 
                });
            }

            const { data: before } = await supabase
                .from('training_slots')
                .select('*')
                .eq('id', id)
                .single();

            const { error } = await supabase
                .from('training_slots')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logAudit(supabase, {
                action: 'delete',
                entity_type: 'training-slot',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: null
            });

            return res.status(200).json({ message: 'Slot deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Training-slots-id error:', error);
        return res.status(500).json({ error: error.message });
    }
};
