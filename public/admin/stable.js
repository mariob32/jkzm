// ===== JKZM Admin - Stajňa MVP =====
// stable.js - kone, tréningy, zdravie, kŕmenie

// Global data stores
let stableHorses = [];
let stableTrainings = [];
let healthEvents = [];
let feedLogs = [];

// ===== HORSES =====
async function loadStableHorses() {
    try {
        const data = await apiGet('horses');
        stableHorses = Array.isArray(data) ? data : [];
        // Update global horses for compatibility
        if (typeof horses !== 'undefined') horses = stableHorses;
        renderStableHorses();
        populateHorseSelectsMVP();
    } catch(e) { 
        console.error('Load stable horses error:', e);
        stableHorses = [];
    }
}

function renderStableHorses() {
    const table = document.getElementById('stableHorsesTable');
    if (!table) return;
    
    if (!stableHorses.length) {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray)">Žiadne kone</td></tr>';
        return;
    }
    
    const sexMap = { mare: 'Kobyla', gelding: 'Valach', stallion: 'Žrebec' };
    table.innerHTML = stableHorses.map(h => `
        <tr>
            <td><strong>${h.name || h.stable_name || '-'}</strong></td>
            <td>${sexMap[h.sex] || h.sex || '-'}</td>
            <td>${h.breed || '-'}</td>
            <td>${h.birth_year || (h.birth_date ? new Date(h.birth_date).getFullYear() : '-')}</td>
            <td>${h.owner_name || '-'}</td>
            <td><span class="badge badge-${h.is_active !== false && h.status !== 'inactive' ? 'success' : 'gray'}">${h.is_active !== false && h.status !== 'inactive' ? 'Aktívny' : 'Neaktívny'}</span></td>
            <td><button class="btn btn-sm btn-outline" onclick="editStableHorse('${h.id}')">✏️</button></td>
        </tr>
    `).join('');
}

function populateHorseSelectsMVP() {
    const horseSelects = ['stTrainingHorse', 'healthEventHorse', 'feedLogHorse', 'trainingsHorseFilter', 'feedHorseFilter'];
    horseSelects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const isFilter = id.includes('Filter');
        sel.innerHTML = isFilter ? '<option value="">Všetky kone</option>' : '<option value="">--</option>';
        stableHorses.filter(h => h.is_active !== false && h.status !== 'inactive').forEach(h => {
            sel.innerHTML += `<option value="${h.id}">${h.name || h.stable_name}</option>`;
        });
    });
    
    // Rider selects
    const riderSelects = ['stTrainingRider', 'stTrainingTrainer'];
    riderSelects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="">--</option>';
        if (typeof riders !== 'undefined' && Array.isArray(riders)) {
            riders.forEach(r => {
                const name = r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim();
                sel.innerHTML += `<option value="${r.id}">${name}</option>`;
            });
        }
    });
}

function openStableHorseModal() {
    document.getElementById('stableHorseForm').reset();
    document.getElementById('stableHorseId').value = '';
    document.getElementById('stableHorseModalTitle').textContent = 'Nový kôň';
    openModal('stableHorseModal');
}

function editStableHorse(id) {
    const h = stableHorses.find(x => x.id === id);
    if (!h) return;
    
    document.getElementById('stableHorseId').value = h.id;
    document.getElementById('stableHorseName').value = h.name || h.stable_name || '';
    document.getElementById('stableHorseSex').value = h.sex || '';
    document.getElementById('stableHorseBirthYear').value = h.birth_year || '';
    document.getElementById('stableHorseBreed').value = h.breed || '';
    document.getElementById('stableHorseColor').value = h.color || '';
    document.getElementById('stableHorseOwner').value = h.owner_name || '';
    document.getElementById('stableHorseFeiId').value = h.fei_id || '';
    document.getElementById('stableHorseNotes').value = h.notes || '';
    document.getElementById('stableHorseModalTitle').textContent = 'Upraviť koňa';
    openModal('stableHorseModal');
}

async function saveStableHorse() {
    const id = document.getElementById('stableHorseId').value;
    const data = {
        name: document.getElementById('stableHorseName').value,
        sex: document.getElementById('stableHorseSex').value || null,
        birth_year: parseInt(document.getElementById('stableHorseBirthYear').value) || null,
        breed: document.getElementById('stableHorseBreed').value || null,
        color: document.getElementById('stableHorseColor').value || null,
        owner_name: document.getElementById('stableHorseOwner').value || null,
        fei_id: document.getElementById('stableHorseFeiId').value || null,
        notes: document.getElementById('stableHorseNotes').value || null
    };
    
    if (!data.name) {
        showToast('Meno je povinné', 'error');
        return;
    }
    
    try {
        if (id) {
            await apiPatch(`horses/${id}`, data);
        } else {
            await apiPost('horses', data);
        }
        closeModal('stableHorseModal');
        showToast(id ? 'Kôň upravený' : 'Kôň pridaný', 'success');
        loadStableHorses();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function deactivateStableHorse(id) {
    if (!confirm('Naozaj deaktivovať koňa?')) return;
    try {
        await apiPatch(`horses/${id}`, { is_active: false, status: 'inactive' });
        showToast('Kôň deaktivovaný', 'success');
        loadStableHorses();
    } catch(e) {
        showToast('Chyba', 'error');
    }
}

// ===== TRAININGS =====
async function loadStableTrainings() {
    try {
        const horseId = document.getElementById('trainingsHorseFilter')?.value || '';
        // Default: last 7 days
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7);
        
        let url = `trainings-v2?date_from=${dateFrom.toISOString().split('T')[0]}&limit=100`;
        if (horseId) url += `&horse_id=${horseId}`;
        
        const json = await apiGet(url);
        stableTrainings = json.data || [];
        renderStableTrainings();
    } catch(e) {
        console.error('Load trainings error:', e);
        stableTrainings = [];
        renderStableTrainings();
    }
}

function renderStableTrainings() {
    const table = document.getElementById('stableTrainingsTable');
    if (!table) return;
    
    if (!stableTrainings.length) {
        table.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray)">Žiadne tréningy za posledných 7 dní</td></tr>';
        return;
    }
    
    const discMap = { jumping: 'Skoky', dressage: 'Drezúra', hacking: 'Terén', groundwork: 'Zem', other: 'Iné' };
    const intMap = { low: 'Nízka', medium: 'Stredná', high: 'Vysoká' };
    
    table.innerHTML = stableTrainings.map(t => `
        <tr>
            <td>${new Date(t.training_date).toLocaleDateString('sk')}</td>
            <td>${t.start_time || '-'}</td>
            <td>${t.horse?.name || '-'}</td>
            <td>${t.rider?.full_name || '-'}</td>
            <td>${t.trainer?.full_name || '-'}</td>
            <td>${discMap[t.discipline] || t.discipline || '-'}</td>
            <td><span class="badge badge-${t.intensity === 'high' ? 'danger' : t.intensity === 'medium' ? 'warning' : 'info'}">${intMap[t.intensity] || '-'}</span></td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteStableTraining('${t.id}')">🗑️</button></td>
        </tr>
    `).join('');
}

function openStableTrainingModal() {
    document.getElementById('stableTrainingForm').reset();
    document.getElementById('stTrainingDate').value = new Date().toISOString().split('T')[0];
    populateHorseSelectsMVP();
    openModal('stableTrainingModal');
}

async function saveStableTraining() {
    const data = {
        training_date: document.getElementById('stTrainingDate').value,
        start_time: document.getElementById('stTrainingTime').value || null,
        horse_id: document.getElementById('stTrainingHorse').value || null,
        rider_id: document.getElementById('stTrainingRider').value || null,
        trainer_id: document.getElementById('stTrainingTrainer').value || null,
        duration_min: parseInt(document.getElementById('stTrainingDuration').value) || 60,
        discipline: document.getElementById('stTrainingDiscipline').value || null,
        intensity: document.getElementById('stTrainingIntensity').value || null,
        goals: document.getElementById('stTrainingGoals').value || null,
        notes: document.getElementById('stTrainingNotes').value || null
    };
    
    if (!data.training_date) {
        showToast('Dátum je povinný', 'error');
        return;
    }
    
    try {
        await apiPost('trainings-v2', data);
        closeModal('stableTrainingModal');
        showToast('Tréning pridaný', 'success');
        loadStableTrainings();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function deleteStableTraining(id) {
    if (!confirm('Naozaj zmazať tréning?')) return;
    try {
        await apiDelete(`trainings-v2/${id}`);
        showToast('Tréning zmazaný', 'success');
        loadStableTrainings();
    } catch(e) {
        showToast('Chyba', 'error');
    }
}

// ===== HEALTH EVENTS =====
async function loadHealthEvents() {
    try {
        const upcomingOnly = document.getElementById('healthUpcomingOnly')?.checked;
        const upcomingDays = 30;
        let url = `health-events?limit=100&upcoming_days=${upcomingDays}`;
        if (upcomingOnly) url += '&upcoming_only=1';
        
        const json = await apiGet(url);
        healthEvents = json.data || [];
        renderHealthEvents();
    } catch(e) {
        console.error('Load health events error:', e);
        healthEvents = [];
        renderHealthEvents();
    }
}

function renderHealthEvents() {
    const table = document.getElementById('healthEventsTable');
    if (!table) return;
    
    if (!healthEvents.length) {
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray)">Žiadne zdravotné udalosti</td></tr>';
        document.getElementById('healthUpcomingAlert').style.display = 'none';
        return;
    }
    
    const catMap = {
        vaccination: 'Očkovanie', deworming: 'Odčervenie', dentist: 'Zuby',
        farrier: 'Podkováč', vet: 'Veterinár', physio: 'Fyzio', other: 'Iné'
    };
    
    const now = new Date();
    let upcomingCount = 0;
    
    table.innerHTML = healthEvents.map(e => {
        const isUpcoming = e.next_due_date && new Date(e.next_due_date) <= new Date(now.getTime() + 30*24*60*60*1000);
        if (isUpcoming) upcomingCount++;
        
        return `
            <tr>
                <td>${new Date(e.event_date).toLocaleDateString('sk')}</td>
                <td>${e.horse?.name || '-'}</td>
                <td>${catMap[e.category] || e.category}</td>
                <td>${e.title}</td>
                <td>${e.next_due_date ? `<span class="badge badge-${isUpcoming ? 'warning' : 'info'}">${new Date(e.next_due_date).toLocaleDateString('sk')}</span>` : '-'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteHealthEvent('${e.id}')">🗑️</button></td>
            </tr>
        `;
    }).join('');
    
    const alert = document.getElementById('healthUpcomingAlert');
    if (alert) alert.style.display = upcomingCount > 0 ? 'block' : 'none';
}

function openHealthEventModal() {
    document.getElementById('healthEventForm').reset();
    document.getElementById('healthEventDate').value = new Date().toISOString().split('T')[0];
    populateHorseSelectsMVP();
    openModal('healthEventModal');
}

async function saveHealthEvent() {
    const data = {
        event_date: document.getElementById('healthEventDate').value,
        horse_id: document.getElementById('healthEventHorse').value,
        category: document.getElementById('healthEventCategory').value,
        title: document.getElementById('healthEventTitle').value,
        details: document.getElementById('healthEventDetails').value || null,
        next_due_date: document.getElementById('healthEventNextDue').value || null
    };
    
    if (!data.event_date || !data.horse_id || !data.category || !data.title) {
        showToast('Vyplňte povinné polia', 'error');
        return;
    }
    
    try {
        await apiPost('health-events', data);
        closeModal('healthEventModal');
        showToast('Zdravotná udalosť pridaná', 'success');
        loadHealthEvents();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function deleteHealthEvent(id) {
    if (!confirm('Naozaj zmazať udalosť?')) return;
    try {
        await apiDelete(`health-events/${id}`);
        showToast('Udalosť zmazaná', 'success');
        loadHealthEvents();
    } catch(e) {
        showToast('Chyba', 'error');
    }
}

// ===== FEED LOGS =====
async function loadFeedLogs() {
    try {
        const horseId = document.getElementById('feedHorseFilter')?.value || '';
        let url = 'feed-logs?limit=100';
        if (horseId) url += `&horse_id=${horseId}`;
        
        const json = await apiGet(url);
        feedLogs = json.data || [];
        renderFeedLogs();
    } catch(e) {
        console.error('Load feed logs error:', e);
        feedLogs = [];
        renderFeedLogs();
    }
}

function renderFeedLogs() {
    const table = document.getElementById('feedLogsTable');
    if (!table) return;
    
    if (!feedLogs.length) {
        table.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray)">Žiadne záznamy kŕmenia</td></tr>';
        return;
    }
    
    table.innerHTML = feedLogs.map(f => `
        <tr>
            <td>${new Date(f.log_date).toLocaleDateString('sk')}</td>
            <td>${f.horse?.name || '-'}</td>
            <td>${f.feed_type}</td>
            <td>${f.amount || '-'}</td>
            <td>${f.notes || '-'}</td>
        </tr>
    `).join('');
}

function openFeedLogModal() {
    document.getElementById('feedLogForm').reset();
    document.getElementById('feedLogDate').value = new Date().toISOString().split('T')[0];
    populateHorseSelectsMVP();
    openModal('feedLogModal');
}

async function saveFeedLog() {
    const data = {
        log_date: document.getElementById('feedLogDate').value,
        horse_id: document.getElementById('feedLogHorse').value,
        feed_type: document.getElementById('feedLogType').value,
        amount: document.getElementById('feedLogAmount').value || null,
        notes: document.getElementById('feedLogNotes').value || null
    };
    
    if (!data.log_date || !data.horse_id || !data.feed_type) {
        showToast('Vyplňte povinné polia', 'error');
        return;
    }
    
    try {
        await apiPost('feed-logs', data);
        closeModal('feedLogModal');
        showToast('Záznam kŕmenia pridaný', 'success');
        loadFeedLogs();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// Export functions to window
if (typeof window !== 'undefined') {
    window.loadStableHorses = loadStableHorses;
    window.renderStableHorses = renderStableHorses;
    window.populateHorseSelectsMVP = populateHorseSelectsMVP;
    window.openStableHorseModal = openStableHorseModal;
    window.editStableHorse = editStableHorse;
    window.saveStableHorse = saveStableHorse;
    window.deactivateStableHorse = deactivateStableHorse;
    
    window.loadStableTrainings = loadStableTrainings;
    window.renderStableTrainings = renderStableTrainings;
    window.openStableTrainingModal = openStableTrainingModal;
    window.saveStableTraining = saveStableTraining;
    window.deleteStableTraining = deleteStableTraining;
    
    window.loadHealthEvents = loadHealthEvents;
    window.renderHealthEvents = renderHealthEvents;
    window.openHealthEventModal = openHealthEventModal;
    window.saveHealthEvent = saveHealthEvent;
    window.deleteHealthEvent = deleteHealthEvent;
    
    window.loadFeedLogs = loadFeedLogs;
    window.renderFeedLogs = renderFeedLogs;
    window.openFeedLogModal = openFeedLogModal;
    window.saveFeedLog = saveFeedLog;
}
