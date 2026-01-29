// ===== JKZM Admin - Training Calendar v6.21.6 =====
// calendar.js - week view, filtre, quick actions

// ===== STATE =====
let calendarSlots = [];
let calendarFrom = null;
let calendarTo = null;
let selectedSlot = null;
let calendarTrainers = [];

// ===== STORAGE KEYS =====
const CALENDAR_WEEK_KEY = 'jkzm_calendar_week_start';
const CALENDAR_FILTERS_KEY = 'jkzm_calendar_filters';

// ===== FILTERS =====
function getCalendarFilters() {
    try {
        const stored = localStorage.getItem(CALENDAR_FILTERS_KEY);
        return stored ? JSON.parse(stored) : { discipline: 'all', status: 'all', trainer_id: 'all' };
    } catch {
        return { discipline: 'all', status: 'all', trainer_id: 'all' };
    }
}

function setCalendarFilters(filters) {
    localStorage.setItem(CALENDAR_FILTERS_KEY, JSON.stringify(filters));
}

function getStoredWeekStart() {
    const stored = localStorage.getItem(CALENDAR_WEEK_KEY);
    if (stored) {
        const date = new Date(stored);
        if (!isNaN(date.getTime())) return stored;
    }
    return null;
}

function setStoredWeekStart(dateStr) {
    localStorage.setItem(CALENDAR_WEEK_KEY, dateStr);
}

// ===== LOAD TRAINERS FOR FILTER =====
async function loadCalendarTrainers() {
    try {
        const json = await apiGet('trainers?limit=100');
        calendarTrainers = json.data || json || [];
        populateTrainerFilter();
    } catch (e) {
        console.error('Load trainers error:', e);
        calendarTrainers = [];
    }
}

function populateTrainerFilter() {
    const sel = document.getElementById('calendarFilterTrainer');
    if (!sel) return;
    
    const currentValue = sel.value;
    sel.innerHTML = '<option value="all">Vsetci treneri</option>';
    
    calendarTrainers.forEach(t => {
        const name = `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Bez mena';
        sel.innerHTML += `<option value="${t.id}">${name}</option>`;
    });
    
    if (currentValue) sel.value = currentValue;
}

// ===== MAIN LOAD =====
async function loadTrainingCalendar() {
    const container = document.getElementById('calendarGrid');
    if (!container) {
        console.error('calendarGrid element not found');
        return;
    }

    // Check token
    const token = localStorage.getItem('jkzm_token');
    if (!token) {
        container.innerHTML = `
            <div class="calendar-error">
                <p><strong>Nie ste prihlaseny.</strong></p>
                <p>Prihlaste sa alebo obnovte stranku.</p>
                <button class="btn btn-primary" onclick="location.reload()">Obnovit stranku</button>
            </div>
        `;
        return;
    }

    // Show loading
    container.innerHTML = '<div class="calendar-loading"><div class="spinner"></div><p>Nacitavam kalendar...</p></div>';

    try {
        // Get week range from stored or calculate
        const storedWeek = getStoredWeekStart();
        let monday;
        
        if (storedWeek) {
            monday = new Date(storedWeek);
        } else {
            monday = getMonday(new Date());
        }
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        calendarFrom = monday.toISOString().split('T')[0];
        calendarTo = sunday.toISOString().split('T')[0];
        setStoredWeekStart(calendarFrom);

        // Update week display
        updateWeekDisplay(monday, sunday);

        // Get filters
        const filters = getCalendarFilters();
        syncFilterUI(filters);

        // Build query
        let url = `training-calendar?from=${calendarFrom}&to=${calendarTo}`;
        if (filters.discipline !== 'all') url += `&discipline=${filters.discipline}`;
        if (filters.status !== 'all') url += `&status=${filters.status}`;
        if (filters.trainer_id !== 'all') url += `&trainer_id=${filters.trainer_id}`;

        const json = await apiGet(url);
        
        if (!json) {
            throw new Error('Prazdna odpoved zo servera');
        }

        calendarSlots = json.slots || [];
        renderTrainingCalendar(json.by_date || {}, json.summary || {});
        
    } catch (e) {
        console.error('Load training calendar error:', e);
        
        let errorMessage = 'Chyba pri nacitani kalendara';
        let errorDetail = e.message || 'Neznama chyba';
        
        if (e.message === 'Unauthorized' || e.message?.includes('401')) {
            errorMessage = 'Neplatne prihlasenie';
            errorDetail = 'Prihlaste sa znova.';
        }

        container.innerHTML = `
            <div class="calendar-error">
                <p><strong>${errorMessage}</strong></p>
                <p>${errorDetail}</p>
                <button class="btn btn-outline" onclick="loadTrainingCalendar()">Skusit znova</button>
            </div>
        `;
        
        showToast(errorMessage, 'error');
    }
}

function updateWeekDisplay(monday, sunday) {
    const weekDisplay = document.getElementById('calendarWeekDisplay');
    if (weekDisplay) {
        const opts = { day: 'numeric', month: 'numeric' };
        weekDisplay.textContent = `${monday.toLocaleDateString('sk', opts)} - ${sunday.toLocaleDateString('sk', opts)}`;
    }
}

function syncFilterUI(filters) {
    const discSel = document.getElementById('calendarFilterDiscipline');
    const statusSel = document.getElementById('calendarFilterStatus');
    const trainerSel = document.getElementById('calendarFilterTrainer');
    
    if (discSel) discSel.value = filters.discipline || 'all';
    if (statusSel) statusSel.value = filters.status || 'all';
    if (trainerSel) trainerSel.value = filters.trainer_id || 'all';
}

// ===== HELPERS =====
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatTime(time) {
    if (!time) return '-';
    return time.substring(0, 5);
}

// ===== RENDER CALENDAR =====
function renderTrainingCalendar(byDate, summary) {
    const container = document.getElementById('calendarGrid');
    if (!container) return;

    // Update summary
    const summaryEl = document.getElementById('calendarSummary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <span class="summary-item"><strong>${summary?.total_slots || 0}</strong> slotov</span>
            <span class="summary-item"><strong>${summary?.total_bookings || 0}</strong> rezervacii</span>
            <span class="summary-item"><strong>${summary?.fully_booked || 0}</strong> plnych</span>
        `;
    }

    // Generate days
    const days = [];
    const monday = new Date(calendarFrom);
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        days.push(day.toISOString().split('T')[0]);
    }

    const dayNames = ['Po', 'Ut', 'St', 'St', 'Pi', 'So', 'Ne'];
    const discMap = { jumping: 'Skoky', dressage: 'Drezura', hacking: 'Teren', groundwork: 'Zem', longing: 'Lonz' };

    let totalSlotsInView = 0;
    
    let html = '<div class="calendar-week">';
    
    days.forEach((dateStr, idx) => {
        const daySlots = (byDate && byDate[dateStr]) ? byDate[dateStr] : [];
        totalSlotsInView += daySlots.length;
        const dayDate = new Date(dateStr);
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        
        // Sort slots by start_time
        daySlots.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
        
        html += `
            <div class="calendar-day${isToday ? ' today' : ''}${isPast ? ' past' : ''}">
                <div class="calendar-day-header" onclick="openSlotModal('${dateStr}')">
                    <strong>${dayNames[idx]}</strong>
                    <span>${dayDate.getDate()}.${dayDate.getMonth() + 1}.</span>
                </div>
                <div class="calendar-day-slots">
        `;

        if (daySlots.length === 0) {
            html += `<div class="calendar-empty">-</div>`;
        } else {
            daySlots.forEach(slot => {
                const bookedCount = slot.booked_count || 0;
                const capacity = slot.capacity || 1;
                const isFull = bookedCount >= capacity;
                const isCancelled = slot.status === 'cancelled';
                const trainerName = slot.trainer ? 
                    `${slot.trainer.first_name || ''} ${slot.trainer.last_name || ''}`.trim() : '';
                
                let statusClass = 'open';
                if (isCancelled) statusClass = 'cancelled';
                else if (isFull) statusClass = 'full';
                
                html += `
                    <div class="calendar-slot ${statusClass}" onclick="openSlotDetail('${slot.id}')">
                        <div class="slot-header">
                            <span class="slot-time">${formatTime(slot.start_time)}</span>
                            <span class="slot-capacity ${isFull ? 'full' : ''}">${bookedCount}/${capacity}</span>
                        </div>
                        <div class="slot-discipline">${discMap[slot.discipline] || slot.discipline || 'Trening'}</div>
                        ${slot.duration_min ? `<div class="slot-duration">${slot.duration_min} min</div>` : ''}
                        ${trainerName ? `<div class="slot-trainer">${trainerName}</div>` : ''}
                    </div>
                `;
            });
        }

        html += `
                </div>
                <button class="btn-add-slot" onclick="event.stopPropagation(); openSlotModal('${dateStr}')" title="Pridat slot">+</button>
            </div>
        `;
    });

    html += '</div>';
    
    // Empty state
    if (totalSlotsInView === 0) {
        html += `
            <div class="calendar-empty-week">
                <p>Ziadne sloty v tomto tyzdni</p>
                <button class="btn btn-primary" onclick="openSlotModal()">Pridat prvy slot</button>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ===== NAVIGATION =====
function calendarPrevWeek() {
    const monday = new Date(calendarFrom);
    monday.setDate(monday.getDate() - 7);
    setStoredWeekStart(monday.toISOString().split('T')[0]);
    loadTrainingCalendar();
}

function calendarNextWeek() {
    const monday = new Date(calendarFrom);
    monday.setDate(monday.getDate() + 7);
    setStoredWeekStart(monday.toISOString().split('T')[0]);
    loadTrainingCalendar();
}

function calendarThisWeek() {
    const monday = getMonday(new Date());
    setStoredWeekStart(monday.toISOString().split('T')[0]);
    loadTrainingCalendar();
}

// ===== FILTERS =====
function applyCalendarFilters() {
    const filters = {
        discipline: document.getElementById('calendarFilterDiscipline')?.value || 'all',
        status: document.getElementById('calendarFilterStatus')?.value || 'all',
        trainer_id: document.getElementById('calendarFilterTrainer')?.value || 'all'
    };
    setCalendarFilters(filters);
    loadTrainingCalendar();
}

function resetCalendarFilters() {
    const filters = { discipline: 'all', status: 'all', trainer_id: 'all' };
    setCalendarFilters(filters);
    syncFilterUI(filters);
    loadTrainingCalendar();
}

// ===== SLOT MODAL =====
function openSlotModal(dateStr) {
    const form = document.getElementById('slotForm');
    if (form) form.reset();
    
    document.getElementById('slotId').value = '';
    document.getElementById('slotDate').value = dateStr || new Date().toISOString().split('T')[0];
    document.getElementById('slotTime').value = '09:00';
    document.getElementById('slotDuration').value = '60';
    document.getElementById('slotCapacity').value = '1';
    document.getElementById('slotStatus').value = 'open';
    document.getElementById('slotModalTitle').textContent = 'Novy treningovy slot';
    
    populateSlotTrainerSelect();
    openModal('slotModal');
}

function populateSlotTrainerSelect() {
    const sel = document.getElementById('slotTrainer');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- bez trenera --</option>';
    calendarTrainers.forEach(t => {
        const name = `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Bez mena';
        sel.innerHTML += `<option value="${t.id}">${name}</option>`;
    });
}

async function saveSlot() {
    const id = document.getElementById('slotId').value;
    const data = {
        slot_date: document.getElementById('slotDate').value,
        start_time: document.getElementById('slotTime').value,
        duration_min: parseInt(document.getElementById('slotDuration').value) || 60,
        discipline: document.getElementById('slotDiscipline').value || null,
        capacity: parseInt(document.getElementById('slotCapacity').value) || 1,
        trainer_id: document.getElementById('slotTrainer').value || null,
        status: document.getElementById('slotStatus')?.value || 'open',
        notes: document.getElementById('slotNotes')?.value || null
    };

    if (!data.slot_date || !data.start_time) {
        showToast('Datum a cas su povinne', 'error');
        return;
    }

    try {
        if (id) {
            await apiPatch(`training-slots/${id}`, data);
            showToast('Slot upraveny', 'success');
        } else {
            await apiPost('training-slots', data);
            showToast('Slot vytvoreny', 'success');
        }
        closeModal('slotModal');
        loadTrainingCalendar();
    } catch (e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== SLOT DETAIL MODAL =====
async function openSlotDetail(slotId) {
    try {
        const slot = await apiGet(`training-slots/${slotId}`);
        if (!slot) {
            showToast('Slot nebol najdeny', 'error');
            return;
        }

        selectedSlot = slot;
        
        const discMap = { jumping: 'Skoky', dressage: 'Drezura', hacking: 'Teren', groundwork: 'Zem', longing: 'Lonz' };
        const trainerName = slot.trainer ? 
            `${slot.trainer.first_name || ''} ${slot.trainer.last_name || ''}`.trim() : 'Nezadany';
        
        const activeBookings = (slot.bookings || []).filter(b => b.status === 'booked' || b.status === 'attended');
        const bookedCount = activeBookings.length;
        const isFull = bookedCount >= (slot.capacity || 1);
        const isCancelled = slot.status === 'cancelled';

        // Slot info
        document.getElementById('slotDetailInfo').innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Datum:</span>
                <span class="detail-value">${slot.slot_date}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Cas:</span>
                <span class="detail-value">${formatTime(slot.start_time)} (${slot.duration_min || 60} min)</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Disciplina:</span>
                <span class="detail-value">${discMap[slot.discipline] || slot.discipline || 'Nezadana'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Trener:</span>
                <span class="detail-value">${trainerName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Kapacita:</span>
                <span class="detail-value ${isFull ? 'text-danger' : ''}">${bookedCount} / ${slot.capacity || 1} ${isFull ? '(PLNY)' : ''}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value badge badge-${isCancelled ? 'danger' : 'success'}">${isCancelled ? 'Zruseny' : 'Aktivny'}</span>
            </div>
            ${slot.notes ? `<div class="detail-row"><span class="detail-label">Poznamka:</span><span class="detail-value">${slot.notes}</span></div>` : ''}
        `;

        // Bookings list
        let bookingsHtml = '';
        if (activeBookings.length === 0) {
            bookingsHtml = '<p class="text-gray">Ziadne aktivne rezervacie</p>';
        } else {
            bookingsHtml = '<div class="bookings-list">';
            activeBookings.forEach(b => {
                const horseName = b.horse?.name || '-';
                const riderName = b.rider ? `${b.rider.first_name || ''} ${b.rider.last_name || ''}`.trim() : '-';
                const statusBadge = b.status === 'attended' ? 'success' : 'info';
                const statusText = b.status === 'attended' ? 'Zucastneny' : 'Rezervovany';
                
                bookingsHtml += `
                    <div class="booking-item">
                        <div class="booking-info">
                            <strong>${horseName}</strong> - ${riderName}
                            <span class="badge badge-${statusBadge}">${statusText}</span>
                        </div>
                        <div class="booking-actions">
                            ${b.status === 'booked' ? `
                                <button class="btn btn-sm btn-success" onclick="markBooking('${b.id}','attended')" title="Zucastnil sa">OK</button>
                                <button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')" title="Zrusit">X</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            bookingsHtml += '</div>';
        }
        document.getElementById('slotDetailBookings').innerHTML = bookingsHtml;

        // Actions visibility
        const addBookingBtn = document.getElementById('slotDetailAddBookingBtn');
        const cancelSlotBtn = document.getElementById('slotDetailCancelBtn');
        
        if (addBookingBtn) {
            addBookingBtn.style.display = (!isCancelled && !isFull) ? 'inline-block' : 'none';
        }
        if (cancelSlotBtn) {
            cancelSlotBtn.style.display = isCancelled ? 'none' : 'inline-block';
        }

        openModal('slotDetailModal');
    } catch (e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

function goToSlotBookings() {
    if (!selectedSlot) return;
    closeModal('slotDetailModal');
    window.location.hash = `bookings?slot_id=${selectedSlot.id}`;
}

function editSlotFromDetail() {
    if (!selectedSlot) return;
    closeModal('slotDetailModal');
    
    document.getElementById('slotId').value = selectedSlot.id;
    document.getElementById('slotDate').value = selectedSlot.slot_date;
    document.getElementById('slotTime').value = selectedSlot.start_time?.substring(0, 5) || '09:00';
    document.getElementById('slotDuration').value = selectedSlot.duration_min || 60;
    document.getElementById('slotDiscipline').value = selectedSlot.discipline || '';
    document.getElementById('slotCapacity').value = selectedSlot.capacity || 1;
    document.getElementById('slotStatus').value = selectedSlot.status || 'open';
    document.getElementById('slotNotes').value = selectedSlot.notes || '';
    
    populateSlotTrainerSelect();
    if (selectedSlot.trainer_id) {
        document.getElementById('slotTrainer').value = selectedSlot.trainer_id;
    }
    
    document.getElementById('slotModalTitle').textContent = 'Upravit slot';
    openModal('slotModal');
}

async function cancelSlotFromDetail() {
    if (!selectedSlot) return;
    
    const reason = prompt('Dovod zrusenia slotu (volitelne):');
    if (reason === null) return; // User clicked cancel
    
    try {
        await apiPatch(`training-slots/${selectedSlot.id}`, { 
            status: 'cancelled',
            notes: reason ? `ZRUSENE: ${reason}` : (selectedSlot.notes || '')
        });
        showToast('Slot zruseny', 'success');
        closeModal('slotDetailModal');
        loadTrainingCalendar();
    } catch (e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function deleteSlotFromDetail() {
    if (!selectedSlot) return;
    if (!confirm('Naozaj zmazat slot? Toto sa neda vratit.')) return;

    try {
        await apiDelete(`training-slots/${selectedSlot.id}`);
        showToast('Slot zmazany', 'success');
        closeModal('slotDetailModal');
        loadTrainingCalendar();
    } catch (e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== BOOKING FROM SLOT DETAIL =====
async function openAddBookingModal() {
    if (!selectedSlot) return;
    
    document.getElementById('quickBookingSlotInfo').textContent = 
        `${selectedSlot.slot_date} ${formatTime(selectedSlot.start_time)}`;
    
    // Populate selects
    await populateQuickBookingSelects();
    
    openModal('quickBookingModal');
}

async function populateQuickBookingSelects() {
    const horseSel = document.getElementById('quickBookingHorse');
    const riderSel = document.getElementById('quickBookingRider');
    
    if (horseSel) {
        horseSel.innerHTML = '<option value="">-- Vyberte kona --</option>';
        try {
            const json = await apiGet('horses?is_active=true&limit=100');
            const horses = json.data || json || [];
            horses.forEach(h => {
                horseSel.innerHTML += `<option value="${h.id}">${h.name || h.stable_name}</option>`;
            });
        } catch (e) {
            console.error('Load horses error:', e);
        }
    }
    
    if (riderSel) {
        riderSel.innerHTML = '<option value="">-- Vyberte jazdca --</option>';
        try {
            const json = await apiGet('riders?is_active=true&limit=100');
            const riders = json.data || json || [];
            riders.forEach(r => {
                const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Bez mena';
                riderSel.innerHTML += `<option value="${r.id}">${name}</option>`;
            });
        } catch (e) {
            console.error('Load riders error:', e);
        }
    }
}

async function saveQuickBooking() {
    if (!selectedSlot) return;

    const horse_id = document.getElementById('quickBookingHorse').value;
    const rider_id = document.getElementById('quickBookingRider').value;

    if (!horse_id || !rider_id) {
        showToast('Vyberte kona a jazdca', 'error');
        return;
    }

    try {
        await apiPost(`training-slots/${selectedSlot.id}/book`, { horse_id, rider_id });
        showToast('Rezervacia vytvorena', 'success');
        closeModal('quickBookingModal');
        openSlotDetail(selectedSlot.id); // Refresh detail
        loadTrainingCalendar();
    } catch (e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== BOOKING ACTIONS =====
async function markBooking(bookingId, status) {
    const confirmText = status === 'attended' ? 
        'Oznacit ako zucastneneho? (vytvori sa zaznam treningu)' : 
        'Oznacit ako neprisiel?';
    
    if (!confirm(confirmText)) return;

    try {
        const result = await apiPost(`training-bookings/${bookingId}/mark`, { status });
        if (status === 'attended' && result.training) {
            showToast('Oznacene + vytvoreny trening', 'success');
        } else {
            showToast('Oznacene', 'success');
        }
        if (selectedSlot) openSlotDetail(selectedSlot.id);
        loadTrainingCalendar();
    } catch (e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Naozaj zrusit rezervaciu?')) return;

    const reason = prompt('Dovod zrusenia (volitelne):');

    try {
        await apiPost(`training-bookings/${bookingId}/cancel`, { reason });
        showToast('Rezervacia zrusena', 'success');
        if (selectedSlot) openSlotDetail(selectedSlot.id);
        loadTrainingCalendar();
    } catch (e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== INIT =====
function initTrainingCalendar() {
    loadCalendarTrainers();
    
    // Filter change handlers
    ['calendarFilterDiscipline', 'calendarFilterStatus', 'calendarFilterTrainer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', applyCalendarFilters);
        }
    });
}

// ===== EXPORTS =====
if (typeof window !== 'undefined') {
    window.loadTrainingCalendar = loadTrainingCalendar;
    window.initTrainingCalendar = initTrainingCalendar;
    window.calendarPrevWeek = calendarPrevWeek;
    window.calendarNextWeek = calendarNextWeek;
    window.calendarThisWeek = calendarThisWeek;
    window.applyCalendarFilters = applyCalendarFilters;
    window.resetCalendarFilters = resetCalendarFilters;
    window.openSlotModal = openSlotModal;
    window.saveSlot = saveSlot;
    window.openSlotDetail = openSlotDetail;
    window.goToSlotBookings = goToSlotBookings;
    window.editSlotFromDetail = editSlotFromDetail;
    window.cancelSlotFromDetail = cancelSlotFromDetail;
    window.deleteSlotFromDetail = deleteSlotFromDetail;
    window.openAddBookingModal = openAddBookingModal;
    window.saveQuickBooking = saveQuickBooking;
    window.markBooking = markBooking;
    window.cancelBooking = cancelBooking;
}
