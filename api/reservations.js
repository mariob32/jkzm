const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { id, arena_id, date, date_from, date_to, status, availability, skill_level } = req.query;
            
            // Špeciálny endpoint pre dostupnosť
            if (availability === 'true' && arena_id && date) {
                return await getAvailability(res, arena_id, date, skill_level);
            }
            
            if (id) {
                const { data, error } = await supabase
                    .from('reservations')
                    .select('*, arenas(name)')
                    .eq('id', id)
                    .single();
                if (error) throw error;
                return res.status(200).json(data);
            }
            
            let query = supabase
                .from('reservations')
                .select('*, arenas(name)')
                .order('reservation_date', { ascending: true })
                .order('start_time', { ascending: true });
            
            if (arena_id) query = query.eq('arena_id', arena_id);
            if (date) query = query.eq('reservation_date', date);
            if (date_from) query = query.gte('reservation_date', date_from);
            if (date_to) query = query.lte('reservation_date', date_to);
            if (status) query = query.eq('status', status);
            
            const { data, error } = await query;
            if (error) throw error;
            
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { 
                arena_id, customer_name, customer_email, customer_phone,
                reservation_date, start_time, end_time, riders_count,
                horse_id, service_type, skill_level, notes 
            } = req.body;
            
            // Validácia
            if (!arena_id || !customer_name || !customer_phone || !reservation_date || !start_time) {
                return res.status(400).json({ error: 'Chýbajú povinné údaje' });
            }
            
            // Kontrola dostupnosti
            const availCheck = await checkAvailability(arena_id, reservation_date, start_time, end_time || addHour(start_time), riders_count || 1, skill_level);
            if (!availCheck.available) {
                return res.status(400).json({ error: availCheck.reason || 'Termín nie je dostupný' });
            }
            
            // Vytvor rezerváciu
            const { data, error } = await supabase
                .from('reservations')
                .insert({
                    arena_id,
                    customer_name,
                    customer_email,
                    customer_phone,
                    reservation_date,
                    start_time,
                    end_time: end_time || addHour(start_time),
                    riders_count: riders_count || 1,
                    horse_id,
                    service_type: service_type || 'lesson',
                    skill_level,
                    notes,
                    status: 'pending'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            return res.status(201).json(data);
        }

        if (req.method === 'PUT') {
            const { id, ...updates } = req.body;
            if (!id) return res.status(400).json({ error: 'ID required' });
            
            // Ak sa mení status na confirmed
            if (updates.status === 'confirmed') {
                updates.confirmed_at = new Date().toISOString();
            }
            if (updates.status === 'cancelled') {
                updates.cancelled_at = new Date().toISOString();
            }
            
            updates.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('reservations')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID required' });
            
            const { error } = await supabase.from('reservations').delete().eq('id', id);
            if (error) throw error;
            
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Reservations API error:', e);
        res.status(500).json({ error: e.message });
    }
};

// Pomocná funkcia pre pridanie hodiny
function addHour(time) {
    const [h, m] = time.split(':').map(Number);
    return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Získaj dostupné sloty pre deň
async function getAvailability(res, arena_id, date, skill_level = null) {
    const dayOfWeek = new Date(date).getDay();
    
    // Získaj rozvrh pre daný deň
    const { data: schedule } = await supabase
        .from('arena_schedules')
        .select('*')
        .eq('arena_id', arena_id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single();
    
    if (!schedule) {
        return res.status(200).json({ slots: [], message: 'V tento deň je zatvorené' });
    }
    
    // Kontrola výnimiek
    const { data: exception } = await supabase
        .from('arena_exceptions')
        .select('*')
        .eq('arena_id', arena_id)
        .eq('exception_date', date)
        .single();
    
    if (exception?.is_closed) {
        return res.status(200).json({ slots: [], message: exception.reason || 'Zatvorené' });
    }
    
    const openTime = exception?.open_time || schedule.open_time;
    const closeTime = exception?.close_time || schedule.close_time;
    const slotDuration = schedule.slot_duration || 60;
    const maxRiders = schedule.max_riders || 4;
    const allowedLevels = schedule.allowed_levels || 'all';
    
    // Kontrola či je úroveň povolená
    let levelAllowed = true;
    if (skill_level && allowedLevels !== 'all') {
        const levels = allowedLevels.split(',');
        levelAllowed = levels.includes(skill_level);
    }
    
    // Generuj sloty
    const slots = [];
    let currentTime = timeToMinutes(openTime);
    const endTime = timeToMinutes(closeTime);
    
    while (currentTime + slotDuration <= endTime) {
        const startStr = minutesToTime(currentTime);
        const endStr = minutesToTime(currentTime + slotDuration);
        
        // Počet existujúcich rezervácií pre tento slot
        const { data: existing } = await supabase
            .from('reservations')
            .select('riders_count')
            .eq('arena_id', arena_id)
            .eq('reservation_date', date)
            .eq('start_time', startStr)
            .in('status', ['pending', 'confirmed']);
        
        const bookedRiders = existing?.reduce((sum, r) => sum + (r.riders_count || 1), 0) || 0;
        const availableSpots = maxRiders - bookedRiders;
        
        slots.push({
            start_time: startStr,
            end_time: endStr,
            available_spots: availableSpots,
            max_spots: maxRiders,
            is_available: availableSpots > 0 && levelAllowed,
            allowed_levels: allowedLevels,
            level_allowed: levelAllowed
        });
        
        currentTime += slotDuration;
    }
    
    return res.status(200).json({ 
        slots, 
        schedule: { 
            open: openTime, 
            close: closeTime, 
            slot_duration: slotDuration,
            allowed_levels: allowedLevels
        }
    });
}

// Kontrola dostupnosti pre konkrétny čas
async function checkAvailability(arena_id, date, start_time, end_time, riders_count, skill_level = null) {
    const dayOfWeek = new Date(date).getDay();
    
    // Kontrola rozvrhu
    const { data: schedule } = await supabase
        .from('arena_schedules')
        .select('*')
        .eq('arena_id', arena_id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single();
    
    if (!schedule) {
        return { available: false, reason: 'V tento deň je aréna zatvorená' };
    }
    
    // Kontrola úrovne jazdca
    const allowedLevels = schedule.allowed_levels || 'all';
    if (skill_level && allowedLevels !== 'all') {
        const levels = allowedLevels.split(',');
        if (!levels.includes(skill_level)) {
            const levelNames = {beginner:'Začiatočník',intermediate:'Mierne pokročilý',advanced:'Pokročilý'};
            const allowedNames = levels.map(l => levelNames[l] || l).join(', ');
            return { available: false, reason: `Tento termín je len pre: ${allowedNames}` };
        }
    }
    
    // Kontrola výnimiek
    const { data: exception } = await supabase
        .from('arena_exceptions')
        .select('*')
        .eq('arena_id', arena_id)
        .eq('exception_date', date)
        .single();
    
    if (exception?.is_closed) {
        return { available: false, reason: exception.reason || 'Aréna je v tento deň zatvorená' };
    }
    
    // Kontrola času
    const openTime = exception?.open_time || schedule.open_time;
    const closeTime = exception?.close_time || schedule.close_time;
    
    if (start_time < openTime || end_time > closeTime) {
        return { available: false, reason: `Aréna je otvorená od ${openTime} do ${closeTime}` };
    }
    
    // Kontrola kapacity
    const { data: existing } = await supabase
        .from('reservations')
        .select('riders_count')
        .eq('arena_id', arena_id)
        .eq('reservation_date', date)
        .eq('start_time', start_time)
        .in('status', ['pending', 'confirmed']);
    
    const bookedRiders = existing?.reduce((sum, r) => sum + (r.riders_count || 1), 0) || 0;
    const maxRiders = schedule.max_riders || 4;
    
    if (bookedRiders + riders_count > maxRiders) {
        return { available: false, reason: `Nedostatok miesta. Voľné: ${maxRiders - bookedRiders}, požadované: ${riders_count}` };
    }
    
    return { available: true };
}

function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
