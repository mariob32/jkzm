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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // POST - nová rezervácia (verejné)
        if (req.method === 'POST') {
            const { 
                space_id, slot_id, booking_date, start_time, end_time,
                customer_name, customer_email, customer_phone,
                participants, horse_name, use_club_horse, experience_level, notes
            } = req.body;
            
            // Validácia
            if (!customer_name || !customer_phone || !booking_date || !start_time || !space_id) {
                return res.status(400).json({ error: 'Meno, telefón, dátum, čas a priestor sú povinné' });
            }
            
            // Skontroluj kapacitu
            const { data: slot } = await supabase
                .from('time_slots')
                .select('max_capacity, price')
                .eq('id', slot_id)
                .single();
            
            // Skontroluj existujúce rezervácie
            const { data: existing } = await supabase
                .from('bookings')
                .select('participants')
                .eq('space_id', space_id)
                .eq('booking_date', booking_date)
                .eq('start_time', start_time)
                .in('status', ['pending', 'confirmed']);
            
            const bookedCount = (existing || []).reduce((sum, b) => sum + (b.participants || 1), 0);
            const requestedParticipants = participants || 1;
            
            if (slot && bookedCount + requestedParticipants > slot.max_capacity) {
                return res.status(400).json({ 
                    error: `Tento termín má len ${slot.max_capacity - bookedCount} voľných miest` 
                });
            }
            
            // Skontroluj blokované dátumy
            const { data: blocked } = await supabase
                .from('blocked_dates')
                .select('id')
                .eq('blocked_date', booking_date)
                .or(`space_id.eq.${space_id},space_id.is.null`);
            
            if (blocked && blocked.length > 0) {
                return res.status(400).json({ error: 'Tento termín nie je dostupný' });
            }
            
            // Vytvor rezerváciu
            const { data, error } = await supabase
                .from('bookings')
                .insert([{
                    space_id, slot_id, booking_date, start_time, end_time,
                    customer_name, customer_email, customer_phone,
                    participants: requestedParticipants,
                    horse_name, use_club_horse, experience_level, notes,
                    total_price: slot ? slot.price * requestedParticipants : null,
                    status: 'pending'
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            return res.status(201).json({ 
                success: true,
                message: 'Rezervácia vytvorená. Budeme vás kontaktovať pre potvrdenie.',
                booking: data
            });
        }

        // GET - zoznam rezervácií (vyžaduje auth)
        if (req.method === 'GET') {
            // Pre admin - všetky rezervácie
            if (verifyToken(req)) {
                const { date_from, date_to, status, space_id } = req.query;
                let query = supabase
                    .from('bookings')
                    .select('*, training_spaces(name, color)')
                    .order('booking_date', { ascending: true })
                    .order('start_time', { ascending: true });
                
                if (date_from) query = query.gte('booking_date', date_from);
                if (date_to) query = query.lte('booking_date', date_to);
                if (status) query = query.eq('status', status);
                if (space_id) query = query.eq('space_id', space_id);
                
                const { data, error } = await query;
                if (error) throw error;
                return res.status(200).json(data);
            }
            
            return res.status(401).json({ error: 'Neautorizovaný' });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Bookings API error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};
