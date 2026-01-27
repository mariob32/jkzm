// ===== JKZM Admin - Billing =====
// billing.js - platby a účtovanie

let billingCharges = [];
let billingSummary = { unpaid_cents: 0, paid_cents: 0 };

// ===== LOAD CHARGES =====
async function loadBillingCharges() {
    try {
        const status = document.getElementById('billingStatusFilter')?.value || 'unpaid';
        const riderId = document.getElementById('billingRiderFilter')?.value || '';
        const horseId = document.getElementById('billingHorseFilter')?.value || '';
        
        let url = `/api/billing-charges?status=${status}&limit=100`;
        if (riderId) url += `&rider_id=${riderId}`;
        if (horseId) url += `&horse_id=${horseId}`;

        const json = await apiGet(url.replace('/api/', ''));
        billingCharges = json.data || [];
        billingSummary = json.summary || { unpaid_cents: 0, paid_cents: 0 };
        
        renderBillingCharges();
        updateBillingSummary();
    } catch(e) {
        console.error('Load billing charges error:', e);
        showToast('Chyba pri načítaní platieb', 'error');
    }
}

function formatCents(cents) {
    return (cents / 100).toFixed(2) + ' €';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('sk');
}

// ===== RENDER =====
function renderBillingCharges() {
    const table = document.getElementById('billingChargesTable');
    if (!table) return;

    if (!billingCharges.length) {
        table.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray)">Žiadne položky</td></tr>';
        return;
    }

    const statusMap = { unpaid: 'Neuhradené', paid: 'Uhradené', void: 'Stornované' };
    const statusBadge = { unpaid: 'warning', paid: 'success', void: 'gray' };

    table.innerHTML = billingCharges.map(c => {
        const riderName = c.rider ? `${c.rider.first_name || ''} ${c.rider.last_name || ''}`.trim() : '-';
        const horseName = c.horse?.name || '-';
        const trainingDate = c.training?.training_date || c.training?.date || '-';

        return `
            <tr>
                <td>${formatDate(c.created_at)}</td>
                <td>${riderName}</td>
                <td>${horseName}</td>
                <td>${trainingDate !== '-' ? formatDate(trainingDate) : '-'}</td>
                <td><strong>${formatCents(c.amount_cents)}</strong></td>
                <td><span class="badge badge-${statusBadge[c.status]}">${statusMap[c.status]}</span></td>
                <td>${c.paid_method || '-'}</td>
                <td>
                    ${c.status === 'unpaid' ? `
                        <button class="btn btn-sm btn-success" onclick="markChargePaid('${c.id}')" title="Uhradiť">Uhradiť</button>
                        <button class="btn btn-sm btn-warning" onclick="voidCharge('${c.id}')" title="Stornovať">Storno</button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline" onclick="editCharge('${c.id}')" title="Upraviť">Upraviť</button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateBillingSummary() {
    const el = document.getElementById('billingSummary');
    if (!el) return;

    el.innerHTML = `
        <span>Neuhradené: <strong style="color:var(--warning)">${formatCents(billingSummary.unpaid_cents)}</strong></span>
        <span style="margin-left:2rem">Uhradené: <strong style="color:var(--success)">${formatCents(billingSummary.paid_cents)}</strong></span>
        <span style="margin-left:2rem">Položiek: <strong>${billingCharges.length}</strong></span>
    `;
}

// ===== ACTIONS =====
async function markChargePaid(chargeId) {
    const method = prompt('Spôsob platby (cash/card/transfer/other):', 'cash');
    if (!method) return;

    const validMethods = ['cash', 'card', 'transfer', 'other'];
    if (!validMethods.includes(method)) {
        showToast('Neplatný spôsob platby', 'error');
        return;
    }

    try {
        await apiPost(`billing-charges/${chargeId}/mark-paid`, { paid_method: method });
        showToast('Platba zaznamenaná', 'success');
        loadBillingCharges();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function voidCharge(chargeId) {
    if (!confirm('Naozaj stornovať túto položku?')) return;

    const reason = prompt('Dôvod storna (voliteľné):');

    try {
        await apiPost(`billing-charges/${chargeId}/void`, { reason });
        showToast('Položka stornovaná', 'success');
        loadBillingCharges();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

function editCharge(chargeId) {
    const charge = billingCharges.find(c => c.id === chargeId);
    if (!charge) return;

    document.getElementById('editChargeId').value = charge.id;
    document.getElementById('editChargeAmount').value = (charge.amount_cents / 100).toFixed(2);
    document.getElementById('editChargeNote').value = charge.note || '';
    document.getElementById('editChargeDueDate').value = charge.due_date || '';

    openModal('editChargeModal');
}

async function saveChargeEdit() {
    const id = document.getElementById('editChargeId').value;
    const amountEur = parseFloat(document.getElementById('editChargeAmount').value);
    const note = document.getElementById('editChargeNote').value;
    const dueDate = document.getElementById('editChargeDueDate').value;

    if (isNaN(amountEur) || amountEur < 0) {
        showToast('Neplatná suma', 'error');
        return;
    }

    try {
        await apiPatch(`billing-charges/${id}`, {
            amount_cents: Math.round(amountEur * 100),
            note: note || null,
            due_date: dueDate || null
        });
        closeModal('editChargeModal');
        showToast('Položka aktualizovaná', 'success');
        loadBillingCharges();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== MANUAL CREATE =====
function openNewChargeModal() {
    document.getElementById('newChargeForm').reset();
    populateBillingSelects();
    openModal('newChargeModal');
}

function populateBillingSelects() {
    // Riders
    const riderSel = document.getElementById('newChargeRider');
    if (riderSel && typeof riders !== 'undefined') {
        riderSel.innerHTML = '<option value="">-- Vyberte --</option>';
        riders.forEach(r => {
            const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Bez mena';
            riderSel.innerHTML += `<option value="${r.id}">${name}</option>`;
        });
    }

    // Horses
    const horseSel = document.getElementById('newChargeHorse');
    if (horseSel && typeof horses !== 'undefined') {
        horseSel.innerHTML = '<option value="">-- Vyberte --</option>';
        horses.forEach(h => {
            horseSel.innerHTML += `<option value="${h.id}">${h.name || h.stable_name}</option>`;
        });
    }

    // Filters
    const riderFilter = document.getElementById('billingRiderFilter');
    if (riderFilter && typeof riders !== 'undefined') {
        riderFilter.innerHTML = '<option value="">Všetci jazdci</option>';
        riders.forEach(r => {
            const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Bez mena';
            riderFilter.innerHTML += `<option value="${r.id}">${name}</option>`;
        });
    }

    const horseFilter = document.getElementById('billingHorseFilter');
    if (horseFilter && typeof horses !== 'undefined') {
        horseFilter.innerHTML = '<option value="">Všetky kone</option>';
        horses.forEach(h => {
            horseFilter.innerHTML += `<option value="${h.id}">${h.name || h.stable_name}</option>`;
        });
    }
}

async function saveNewCharge() {
    const amountEur = parseFloat(document.getElementById('newChargeAmount').value);
    const riderId = document.getElementById('newChargeRider').value;
    const horseId = document.getElementById('newChargeHorse').value;
    const note = document.getElementById('newChargeNote').value;
    const dueDate = document.getElementById('newChargeDueDate').value;

    if (isNaN(amountEur) || amountEur < 0) {
        showToast('Neplatná suma', 'error');
        return;
    }

    try {
        await apiPost('billing-charges', {
            amount_cents: Math.round(amountEur * 100),
            rider_id: riderId || null,
            horse_id: horseId || null,
            note: note || null,
            due_date: dueDate || null
        });
        closeModal('newChargeModal');
        showToast('Položka vytvorená', 'success');
        loadBillingCharges();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== EXPORT CSV =====
function exportBillingCSV() {
    if (!billingCharges.length) {
        showToast('Žiadne dáta na export', 'warning');
        return;
    }

    const statusMap = { unpaid: 'Neuhradené', paid: 'Uhradené', void: 'Stornované' };
    
    const headers = ['Dátum', 'Jazdec', 'Kôň', 'Suma', 'Status', 'Spôsob platby', 'Poznámka'];
    const rows = billingCharges.map(c => {
        const riderName = c.rider ? `${c.rider.first_name || ''} ${c.rider.last_name || ''}`.trim() : '';
        const horseName = c.horse?.name || '';
        return [
            formatDate(c.created_at),
            riderName,
            horseName,
            formatCents(c.amount_cents),
            statusMap[c.status],
            c.paid_method || '',
            (c.note || '').replace(/"/g, '""')
        ];
    });

    let csv = headers.join(';') + '\n';
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(';')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `platby-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('CSV exportované', 'success');
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadBillingCharges = loadBillingCharges;
    window.markChargePaid = markChargePaid;
    window.voidCharge = voidCharge;
    window.editCharge = editCharge;
    window.saveChargeEdit = saveChargeEdit;
    window.openNewChargeModal = openNewChargeModal;
    window.saveNewCharge = saveNewCharge;
    window.exportBillingCSV = exportBillingCSV;
    window.populateBillingSelects = populateBillingSelects;
}
