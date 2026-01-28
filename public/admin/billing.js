// ===== JKZM Admin - Billing v6.21.1 =====
// billing.js - platby a účtovanie s vylepšeným UX

let billingCharges = [];
let billingSummary = { unpaid_count: 0, unpaid_cents: 0, paid_count: 0, paid_cents: 0, void_count: 0, void_cents: 0 };

const VALID_PAID_METHODS = [
    { value: 'cash', label: 'Hotovosť' },
    { value: 'card', label: 'Karta' },
    { value: 'bank', label: 'Bankový prevod' },
    { value: 'other', label: 'Iné' }
];

// ===== LOAD CHARGES =====
async function loadBillingCharges() {
    try {
        const status = document.getElementById('billingStatusFilter')?.value || 'unpaid';
        const riderId = document.getElementById('billingRiderFilter')?.value || '';
        const horseId = document.getElementById('billingHorseFilter')?.value || '';
        const searchQuery = document.getElementById('billingSearchQuery')?.value || '';
        
        let url = `billing-charges?status=${status}&limit=200`;
        if (riderId) url += `&rider_id=${riderId}`;
        if (horseId) url += `&horse_id=${horseId}`;
        if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery.trim())}`;

        const json = await apiGet(url);
        billingCharges = json.data || [];
        billingSummary = json.summary || { unpaid_count: 0, unpaid_cents: 0, paid_count: 0, paid_cents: 0, void_count: 0, void_cents: 0 };
        
        renderBillingCharges();
        updateBillingSummary();
        updateQuickFilters();
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

// ===== QUICK FILTERS =====
function setQuickFilter(status) {
    document.getElementById('billingStatusFilter').value = status;
    loadBillingCharges();
}

function updateQuickFilters() {
    const btns = document.querySelectorAll('.quick-filter-btn');
    const currentStatus = document.getElementById('billingStatusFilter')?.value || 'unpaid';
    btns.forEach(btn => {
        const s = btn.dataset.status;
        btn.classList.toggle('active', s === currentStatus);
    });
}

// ===== RENDER =====
function renderBillingCharges() {
    const table = document.getElementById('billingChargesTable');
    if (!table) return;

    if (!billingCharges.length) {
        table.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--gray)">Žiadne položky</td></tr>';
        return;
    }

    const statusMap = { unpaid: 'Neuhradené', paid: 'Uhradené', void: 'Stornované' };
    const statusBadge = { unpaid: 'warning', paid: 'success', void: 'gray' };

    table.innerHTML = billingCharges.map(c => {
        const riderName = c.rider ? `${c.rider.first_name || ''} ${c.rider.last_name || ''}`.trim() : '-';
        const horseName = c.horse?.name || '-';
        const trainingDate = c.training?.training_date || c.training?.date || '-';
        const ruleName = c.computed_details?.rule_name || '-';

        // Extra info
        let extraInfo = [];
        if (c.reference_code) extraInfo.push(`Ref: ${c.reference_code}`);
        if (c.paid_reference) extraInfo.push(`Doklad: ${c.paid_reference}`);
        if (c.void_reason) extraInfo.push(`Dôvod: ${c.void_reason}`);
        const extraStr = extraInfo.length ? `<br><small style="color:var(--gray)">${extraInfo.join(' | ')}</small>` : '';

        return `
            <tr>
                <td>${formatDate(c.created_at)}</td>
                <td>${riderName}</td>
                <td>${horseName}</td>
                <td>${trainingDate !== '-' ? formatDate(trainingDate) : '-'}</td>
                <td><strong>${formatCents(c.amount_cents)}</strong><br><small style="color:var(--gray)">${ruleName}</small></td>
                <td><span class="badge badge-${statusBadge[c.status]}">${statusMap[c.status]}</span>${extraStr}</td>
                <td>${c.paid_method || '-'}</td>
                <td>
                    ${c.status === 'unpaid' ? `
                        <button class="btn btn-sm btn-success" onclick="openMarkPaidModal('${c.id}')" title="Uhradiť">Uhradiť</button>
                        <button class="btn btn-sm btn-warning" onclick="openVoidModal('${c.id}')" title="Stornovať">Storno</button>
                    ` : '<span style="color:var(--gray)">Spracované</span>'}
                </td>
                <td>
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
        <span>Neuhradené: <strong style="color:var(--warning)">${formatCents(billingSummary.unpaid_cents || 0)}</strong> (${billingSummary.unpaid_count || 0})</span>
        <span style="margin-left:1.5rem">Uhradené: <strong style="color:var(--success)">${formatCents(billingSummary.paid_cents || 0)}</strong> (${billingSummary.paid_count || 0})</span>
        <span style="margin-left:1.5rem">Stornované: <strong style="color:var(--gray)">${formatCents(billingSummary.void_cents || 0)}</strong> (${billingSummary.void_count || 0})</span>
    `;
}

// ===== MARK PAID MODAL =====
function openMarkPaidModal(chargeId) {
    const charge = billingCharges.find(c => c.id === chargeId);
    if (!charge) return;

    document.getElementById('markPaidChargeId').value = chargeId;
    document.getElementById('markPaidMethod').value = 'cash';
    document.getElementById('markPaidReference').value = '';
    
    // Display charge info
    const riderName = charge.rider ? `${charge.rider.first_name || ''} ${charge.rider.last_name || ''}`.trim() : '-';
    document.getElementById('markPaidChargeInfo').innerHTML = `
        <p><strong>Suma:</strong> ${formatCents(charge.amount_cents)}</p>
        <p><strong>Jazdec:</strong> ${riderName}</p>
    `;

    openModal('markPaidModal');
}

async function confirmMarkPaid() {
    const chargeId = document.getElementById('markPaidChargeId').value;
    const paidMethod = document.getElementById('markPaidMethod').value;
    const paidReference = document.getElementById('markPaidReference').value.trim();

    if (!paidMethod) {
        showToast('Vyberte spôsob platby', 'error');
        return;
    }

    try {
        await apiPost(`billing-charges/${chargeId}/mark-paid`, { 
            paid_method: paidMethod,
            paid_reference: paidReference || null
        });
        closeModal('markPaidModal');
        showToast('Platba zaznamenaná', 'success');
        loadBillingCharges();
    } catch(e) {
        showToast('Chyba: ' + (e.message || 'Neznáma chyba'), 'error');
    }
}

// ===== VOID MODAL =====
function openVoidModal(chargeId) {
    const charge = billingCharges.find(c => c.id === chargeId);
    if (!charge) return;

    document.getElementById('voidChargeId').value = chargeId;
    document.getElementById('voidReason').value = '';
    
    const riderName = charge.rider ? `${charge.rider.first_name || ''} ${charge.rider.last_name || ''}`.trim() : '-';
    document.getElementById('voidChargeInfo').innerHTML = `
        <p><strong>Suma:</strong> ${formatCents(charge.amount_cents)}</p>
        <p><strong>Jazdec:</strong> ${riderName}</p>
    `;

    openModal('voidModal');
}

async function confirmVoid() {
    const chargeId = document.getElementById('voidChargeId').value;
    const reason = document.getElementById('voidReason').value.trim();

    if (!reason) {
        showToast('Dôvod storna je povinný', 'error');
        return;
    }

    try {
        await apiPost(`billing-charges/${chargeId}/void`, { reason });
        closeModal('voidModal');
        showToast('Položka stornovaná', 'success');
        loadBillingCharges();
    } catch(e) {
        showToast('Chyba: ' + (e.message || 'Neznáma chyba'), 'error');
    }
}

// ===== EDIT CHARGE =====
function editCharge(chargeId) {
    const charge = billingCharges.find(c => c.id === chargeId);
    if (!charge) return;

    document.getElementById('editChargeId').value = charge.id;
    document.getElementById('editChargeAmount').value = (charge.amount_cents / 100).toFixed(2);
    document.getElementById('editChargeNote').value = charge.note || '';
    document.getElementById('editChargeDueDate').value = charge.due_date || '';
    document.getElementById('editChargeRefCode').value = charge.reference_code || '';

    openModal('editChargeModal');
}

async function saveChargeEdit() {
    const id = document.getElementById('editChargeId').value;
    const amountEur = parseFloat(document.getElementById('editChargeAmount').value);
    const note = document.getElementById('editChargeNote').value;
    const dueDate = document.getElementById('editChargeDueDate').value;
    const refCode = document.getElementById('editChargeRefCode').value;

    if (isNaN(amountEur) || amountEur < 0) {
        showToast('Neplatná suma', 'error');
        return;
    }

    try {
        await apiPatch(`billing-charges/${id}`, {
            amount_cents: Math.round(amountEur * 100),
            note: note || null,
            due_date: dueDate || null,
            reference_code: refCode || null
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
    const riderSel = document.getElementById('newChargeRider');
    if (riderSel && typeof riders !== 'undefined') {
        riderSel.innerHTML = '<option value="">-- Vyberte --</option>';
        riders.forEach(r => {
            const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Bez mena';
            riderSel.innerHTML += `<option value="${r.id}">${name}</option>`;
        });
    }

    const horseSel = document.getElementById('newChargeHorse');
    if (horseSel && typeof horses !== 'undefined') {
        horseSel.innerHTML = '<option value="">-- Vyberte --</option>';
        horses.forEach(h => {
            horseSel.innerHTML += `<option value="${h.id}">${h.name || h.stable_name}</option>`;
        });
    }

    const riderFilter = document.getElementById('billingRiderFilter');
    if (riderFilter && typeof riders !== 'undefined') {
        const current = riderFilter.value;
        riderFilter.innerHTML = '<option value="">Všetci jazdci</option>';
        riders.forEach(r => {
            const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Bez mena';
            riderFilter.innerHTML += `<option value="${r.id}">${name}</option>`;
        });
        riderFilter.value = current;
    }

    const horseFilter = document.getElementById('billingHorseFilter');
    if (horseFilter && typeof horses !== 'undefined') {
        const current = horseFilter.value;
        horseFilter.innerHTML = '<option value="">Všetky kone</option>';
        horses.forEach(h => {
            horseFilter.innerHTML += `<option value="${h.id}">${h.name || h.stable_name}</option>`;
        });
        horseFilter.value = current;
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
    
    const headers = ['Dátum', 'Jazdec', 'Kôň', 'Suma EUR', 'Status', 'Spôsob platby', 'Pravidlo', 'Referencia', 'Doklad', 'Dôvod storna', 'Poznámka'];
    const rows = billingCharges.map(c => {
        const riderName = c.rider ? `${c.rider.first_name || ''} ${c.rider.last_name || ''}`.trim() : '';
        const horseName = c.horse?.name || '';
        const ruleName = c.computed_details?.rule_name || '';
        return [
            formatDate(c.created_at),
            riderName,
            horseName,
            (c.amount_cents / 100).toFixed(2),
            statusMap[c.status],
            c.paid_method || '',
            ruleName,
            c.reference_code || '',
            c.paid_reference || '',
            c.void_reason || '',
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

// ===== SEARCH ON ENTER =====
function handleBillingSearch(e) {
    if (e.key === 'Enter') {
        loadBillingCharges();
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadBillingCharges = loadBillingCharges;
    window.setQuickFilter = setQuickFilter;
    window.openMarkPaidModal = openMarkPaidModal;
    window.confirmMarkPaid = confirmMarkPaid;
    window.openVoidModal = openVoidModal;
    window.confirmVoid = confirmVoid;
    window.editCharge = editCharge;
    window.saveChargeEdit = saveChargeEdit;
    window.openNewChargeModal = openNewChargeModal;
    window.saveNewCharge = saveNewCharge;
    window.exportBillingCSV = exportBillingCSV;
    window.populateBillingSelects = populateBillingSelects;
    window.handleBillingSearch = handleBillingSearch;
}
