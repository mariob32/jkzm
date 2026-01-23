const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { date, space_id } = req.query;
        
        if (!date) {
            return res.status(400).json({ error: 'Chýba parameter date' });
        }
        
        const selectedDate = new Date(date);
        const dayOfWeek = selectedDate.getDay();
        const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
        
        // Načítaj priestory
        let spacesQuery = supabase.from('training_spaces').select('*').eq('is_active', true).order('sort_order');
        if (space_id) spacesQuery = spacesQuery.eq('id', space_id);
        const { data: spaces } = await spacesQuery;
        
        // Načítaj sloty pre tento deň
        let slotsQuery = supabase.from('time_slots')
            .select('*')
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true)
            .order('start_time');
        if (space_id) slotsQuery = slotsQuery.eq('space_id', space_id);
        const { data: slots } = await slotsQuery;
        
        // Načítaj existujúce rezervácie
        let bookingsQuery = supabase.from('bookings')
            .select('*')
            .eq('booking_date', date)
            .in('status', ['pending', 'confirmed']);
        if (space_id) bookingsQuery = bookingsQuery.eq('space_id', space_id);
        const { data: bookings } = await bookingsQuery;
        
        // Načítaj blokované dátumy
        let blockedQuery = supabase.from('blocked_dates').select('*').eq('blocked_date', date);
        if (space_id) blockedQuery = blockedQuery.eq('space_id', space_id);
        const { data: blocked } = await blockedQuery;
        
        // Zostav výsledok
        const availability = (spaces || []).map(space => {
            const spaceSlots = (slots || []).filter(s => s.space_id === space.id);
            const spaceBookings = (bookings || []).filter(b => b.space_id === space.id);
            const isBlocked = (blocked || []).some(b => b.space_id === space.id || b.space_id === null);
            
            const availableSlots = spaceSlots.map(slot => {
                // Počet existujúcich rezervácií pre tento slot
                const bookedCount = spaceBookings.filter(b => 
                    b.start_time === slot.start_time
                ).reduce((sum, b) => sum + (b.participants || 1), 0);
                
                const availableSpots = isBlocked ? 0 : Math.max(0, slot.max_capacity - bookedCount);
                
                return {
                    id: slot.id,
                    start_time: slot.start_time.substring(0, 5),
                    end_time: slot.end_time.substring(0, 5),
                    slot_type: slot.slot_type,
                    price: slot.price,
                    max_capacity: slot.max_capacity,
                    booked_count: bookedCount,
                    available_spots: availableSpots,
                    is_available: availableSpots > 0
                };
            });
            
            return {
                id: space.id,
                name: space.name,
                description: space.description,
                is_indoor: space.is_indoor,
                color: space.color,
                is_blocked: isBlocked,
                slots: availableSlots,
                total_available: availableSlots.filter(s => s.is_available).length
            };
        });
        
        return res.status(200).json({
            date,
            day_of_week: dayOfWeek,
            day_name: dayNames[dayOfWeek],
            spaces: availability
        });
        
    } catch (e) {
        console.error('Availability API error:', e);
        res.status(500).json({ error: e.message });
    }
};
