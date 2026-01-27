// ===== JKZM Admin - Training Calendar =====
// calendar.js - sloty a rezervácie tréningov

let calendarSlots = [];
let calendarFrom = null;
let calendarTo = null;
let selectedSlot = null;

// ===== LOAD CALENDAR =====
async function loadTrainingCalendar() {
    try {
        // Get week range
        const weekOffset = parseInt(document.getElementById('calendarWeekOffset')?.value || '0');
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + weekOffset * 7);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        calendarFrom = monday.toISOString().split('T')[0];
        calendarTo = sunday.toISOString().split('T')[0];

        // Update week display
        document.getElementById('calendarWeekDisplay').textContent = 
            `${formatDate(monday)} - ${formatDate(sunday)}`;

        const json = await apiGet(`training-calendar?from=${calendarFrom}&to=${calendarTo}`);
        calendarSlots = json.slots || [];
        
        renderTrainingCalendar(json.by_date || {}, json.summary || {});
    } catch(e) {
        console.error('Load training calendar error:', e);
        showToast('Chyba pri načítaní kalendára', 'error');
    }
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDate(date) {
    return date.toLocaleDateString('sk', { day: 'numeric', month: 'numeric' });
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
    if (summaryEl && summary) {
        summaryEl.innerHTML = `
            <span>Slotov: <strong>${summary.total_slots || 0}</strong></span>
            <span>Rezervácií: <strong>${summary.total_bookings || 0}</strong></span>
            <span>Plných: <strong>${summary.fully_booked || 0}</strong></span>
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

    const dayNames = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
    const discMap = { jumping: 'Skoky', dressage: 'Drezúra', hacking: 'Terén', groundwork: 'Zem' };
    const statusColors = { open: 'success', closed: 'gray', cancelled: 'danger' };

    let html = '<div class="calendar-week">';
    
    days.forEach((dateStr, idx) => {
        const daySlots = byDate[dateStr] || [];
        const dayDate = new Date(dateStr);
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="calendar-day-header">
                    <strong>${dayNames[idx]}</strong>
                    <span>${dayDate.getDate()}.${dayDate.getMonth() + 1}.</span>
                </div>
                <div class="calendar-day-slots">
        `;

        if (daySlots.length === 0) {
            html += `<div class="calendar-empty">Žiadne sloty</div>`;
        } else {
            daySlots.forEach(slot => {
                const activeBookings = (slot.bookings || []).filter(b => b.status === 'booked');
                const trainerName = slot.trainer ? 
                    `${slot.trainer.first_name || ''} ${slot.trainer.last_name || ''}`.trim() : '';
                
                html += `
                    <div class="calendar-slot status-${slot.status}" onclick="openSlotDetail('${slot.id}')">
                        <div class="slot-time">${formatTime(slot.start_time)}</div>
                        <div class="slot-info">
                            ${discMap[slot.discipline] || slot.discipline || 'Tréning'}
                            ${trainerName ? `<small>(${trainerName})</small>` : ''}
                        </div>
                        <div class="slot-capacity">
                            <span class="badge badge-${activeBookings.length >= slot.capacity ? 'danger' : 'info'}">
                                ${activeBookings.length}/${slot.capacity}
                            </span>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                </div>
                <button class="btn btn-sm btn-outline" style="margin-top:0.5rem;width:100%" 
                    onclick="openSlotModal('${dateStr}')">+ Slot</button>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ===== NAVIGATION =====
function calendarPrevWeek() {
    const el = document.getElementById('calendarWeekOffset');
    el.value = parseInt(el.value || '0') - 1;
    loadTrainingCalendar();
}

function calendarNextWeek() {
    const el = document.getElementById('calendarWeekOffset');
    el.value = parseInt(el.value || '0') + 1;
    loadTrainingCalendar();
}

function calendarThisWeek() {
    document.getElementById('calendarWeekOffset').value = '0';
    loadTrainingCalendar();
}

// ===== SLOT MODAL =====
function openSlotModal(dateStr) {
    document.getElementById('slotForm').reset();
    document.getElementById('slotId').value = '';
    document.getElementById('slotDate').value = dateStr || new Date().toISOString().split('T')[0];
    document.getElementById('slotTime').value = '09:00';
    document.getElementById('slotDuration').value = '60';
    document.getElementById('slotCapacity').value = '1';
    document.getElementById('slotModalTitle').textContent = 'Nový tréningový slot';
    
    populateTrainerSelect();
    openModal('slotModal');
}

function populateTrainerSelect() {
    const sel = document.getElementById('slotTrainer');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- bez trénera --</option>';
    if (typeof riders !== 'undefined' && Array.isArray(riders)) {
        riders.filter(r => r.role === 'trainer' || r.is_trainer).forEach(r => {
            const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.full_name || 'Bez mena';
            sel.innerHTML += `<option value="${r.id}">${name}</option>`;
        });
    }
    // Fallback - all riders
    if (sel.options.length <= 1 && typeof riders !== 'undefined') {
        riders.forEach(r => {
            const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.full_name || 'Bez mena';
            sel.innerHTML += `<option value="${r.id}">${name}</option>`;
        });
    }
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
        notes: document.getElementById('slotNotes').value || null
    };

    if (!data.slot_date || !data.start_time) {
        showToast('Dátum a čas sú povinné', 'error');
        return;
    }

    try {
        if (id) {
            await apiPatch(`training-slots/${id}`, data);
            showToast('Slot aktualizovaný', 'success');
        } else {
            await apiPost('training-slots', data);
            showToast('Slot vytvorený', 'success');
        }
        closeModal('slotModal');
        loadTrainingCalendar();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== SLOT DETAIL =====
async function openSlotDetail(slotId) {
    try {
        const slot = await apiGet(`training-slots/${slotId}`);
        selectedSlot = slot;
        
        const discMap = { jumping: 'Skoky', dressage: 'Drezúra', hacking: 'Terén', groundwork: 'Zem' };
        const statusMap = { open: 'Otvorený', closed: 'Zatvorený', cancelled: 'Zrušený' };
        const trainerName = slot.trainer ? 
            `${slot.trainer.first_name || ''} ${slot.trainer.last_name || ''}`.trim() : '-';

        document.getElementById('slotDetailInfo').innerHTML = `
            <p><strong>Dátum:</strong> ${new Date(slot.slot_date).toLocaleDateString('sk')}</p>
            <p><strong>Čas:</strong> ${formatTime(slot.start_time)} (${slot.duration_min} min)</p>
            <p><strong>Disciplína:</strong> ${discMap[slot.discipline] || slot.discipline || '-'}</p>
            <p><strong>Tréner:</strong> ${trainerName}</p>
            <p><strong>Kapacita:</strong> ${slot.capacity}</p>
            <p><strong>Status:</strong> <span class="badge badge-${slot.status === 'open' ? 'success' : 'gray'}">${statusMap[slot.status]}</span></p>
        `;

        // Render bookings
        const bookings = slot.bookings || [];
        const activeBookings = bookings.filter(b => b.status !== 'cancelled');
        
        let bookingsHtml = '';
        if (activeBookings.length === 0) {
            bookingsHtml = '<p style="color:var(--gray)">Žiadne rezervácie</p>';
        } else {
            bookingsHtml = activeBookings.map(b => {
                const horseName = b.horse?.name || '-';
                const riderName = b.rider ? `${b.rider.first_name || ''} ${b.rider.last_name || ''}`.trim() : '-';
                const statusBadge = b.status === 'booked' ? 'info' : 
                                   b.status === 'attended' ? 'success' : 
                                   b.status === 'no_show' ? 'warning' : 'gray';
                const statusText = b.status === 'booked' ? 'Rezervované' : 
                                  b.status === 'attended' ? 'Zúčastnený' : 
                                  b.status === 'no_show' ? 'Neprišiel' : 'Zrušené';
                const linkedBadge = b.training_id ? '<span class="badge badge-success" style="margin-left:0.25rem" title="Tréning vytvorený">✓</span>' : '';

                return `
                    <div class="booking-item" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;border-bottom:1px solid var(--gray-light)">
                        <div>
                            <strong>${horseName}</strong> - ${riderName}
                            <span class="badge badge-${statusBadge}" style="margin-left:0.5rem">${statusText}</span>
                            ${linkedBadge}
                        </div>
                        <div>
                            ${b.status === 'booked' ? `
                                <button class="btn btn-sm btn-success" onclick="markBooking('${b.id}','attended')" title="Zúčastnil sa">✓</button>
                                <button class="btn btn-sm btn-warning" onclick="markBooking('${b.id}','no_show')" title="Neprišiel">✗</button>
                                <button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')" title="Zrušiť">Zrušiť</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        document.getElementById('slotDetailBookings').innerHTML = bookingsHtml;

        // Show/hide book button based on capacity
        const bookBtn = document.getElementById('slotDetailBookBtn');
        if (bookBtn) {
            const bookedCount = activeBookings.filter(b => b.status === 'booked').length;
            bookBtn.style.display = slot.status === 'open' && bookedCount < slot.capacity ? 'inline-block' : 'none';
        }

        document.getElementById('slotDetailId').value = slotId;
        openModal('slotDetailModal');
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== BOOKING =====
function openBookingModal() {
    if (!selectedSlot) return;
    document.getElementById('bookingForm').reset();
    populateBookingSelects();
    openModal('bookingModal');
}

function populateBookingSelects() {
    // Horses
    const horseSel = document.getElementById('bookingHorse');
    if (horseSel) {
        horseSel.innerHTML = '<option value="">-- Vyberte koňa --</option>';
        if (typeof horses !== 'undefined' && Array.isArray(horses)) {
            horses.filter(h => h.is_active !== false && h.status !== 'inactive').forEach(h => {
                horseSel.innerHTML += `<option value="${h.id}">${h.name || h.stable_name}</option>`;
            });
        }
    }

    // Riders
    const riderSel = document.getElementById('bookingRider');
    if (riderSel) {
        riderSel.innerHTML = '<option value="">-- Vyberte jazdca --</option>';
        if (typeof riders !== 'undefined' && Array.isArray(riders)) {
            riders.filter(r => r.is_active !== false && r.status !== 'inactive').forEach(r => {
                const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.full_name || 'Bez mena';
                riderSel.innerHTML += `<option value="${r.id}">${name}</option>`;
            });
        }
    }
}

async function saveBooking() {
    if (!selectedSlot) return;

    const horse_id = document.getElementById('bookingHorse').value;
    const rider_id = document.getElementById('bookingRider').value;

    if (!horse_id || !rider_id) {
        showToast('Vyberte koňa a jazdca', 'error');
        return;
    }

    try {
        await apiPost(`training-slots/${selectedSlot.id}/book`, { horse_id, rider_id });
        showToast('Rezervácia vytvorená', 'success');
        closeModal('bookingModal');
        openSlotDetail(selectedSlot.id); // Refresh detail
        loadTrainingCalendar();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Naozaj zrušiť rezerváciu?')) return;

    const reason = prompt('Dôvod zrušenia (nepovinné):');

    try {
        await apiPost(`training-bookings/${bookingId}/cancel`, { reason });
        showToast('Rezervácia zrušená', 'success');
        if (selectedSlot) openSlotDetail(selectedSlot.id);
        loadTrainingCalendar();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function markBooking(bookingId, status) {
    const confirmText = status === 'attended' ? 
        'Označiť ako zúčastneného? (vytvorí sa záznam tréningu)' : 
        'Označiť ako neprišiel?';
    
    if (!confirm(confirmText)) return;

    try {
        const result = await apiPost(`training-bookings/${bookingId}/mark`, { status });
        if (status === 'attended' && result.training) {
            showToast('Označené + vytvorený tréning', 'success');
        } else {
            showToast('Označené', 'success');
        }
        if (selectedSlot) openSlotDetail(selectedSlot.id);
        loadTrainingCalendar();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== SLOT ACTIONS =====
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
    
    populateTrainerSelect();
    if (selectedSlot.trainer_id) {
        document.getElementById('slotTrainer').value = selectedSlot.trainer_id;
    }
    
    document.getElementById('slotModalTitle').textContent = 'Upraviť slot';
    openModal('slotModal');
}

async function deleteSlotFromDetail() {
    if (!selectedSlot) return;
    if (!confirm('Naozaj zmazať slot?')) return;

    try {
        await apiDelete(`training-slots/${selectedSlot.id}`);
        showToast('Slot zmazaný', 'success');
        closeModal('slotDetailModal');
        loadTrainingCalendar();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function cancelSlotFromDetail() {
    if (!selectedSlot) return;
    if (!confirm('Naozaj zrušiť slot? (status = cancelled)')) return;

    try {
        await apiPatch(`training-slots/${selectedSlot.id}`, { status: 'cancelled' });
        showToast('Slot zrušený', 'success');
        closeModal('slotDetailModal');
        loadTrainingCalendar();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadTrainingCalendar = loadTrainingCalendar;
    window.calendarPrevWeek = calendarPrevWeek;
    window.calendarNextWeek = calendarNextWeek;
    window.calendarThisWeek = calendarThisWeek;
    window.openSlotModal = openSlotModal;
    window.saveSlot = saveSlot;
    window.openSlotDetail = openSlotDetail;
    window.openBookingModal = openBookingModal;
    window.saveBooking = saveBooking;
    window.cancelBooking = cancelBooking;
    window.markBooking = markBooking;
    window.editSlotFromDetail = editSlotFromDetail;
    window.deleteSlotFromDetail = deleteSlotFromDetail;
    window.cancelSlotFromDetail = cancelSlotFromDetail;
}
