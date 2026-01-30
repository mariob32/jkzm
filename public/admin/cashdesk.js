// ===== CASHDESK / POKLADNA MODULE =====
// Daily close and payment overview

let cashdeskData = { summary: null, charges: [] };
let cashdeskFilters = {
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    search: ''
};

// ===== DATE HELPERS =====
function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

function getWeekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
}

function getMonthStart() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

// ===== QUICK DATE BUTTONS =====
function setCashdeskDateRange(preset) {
    const today = getToday();
    
    switch (preset) {
        case 'today':
            cashdeskFilters.from = today;
            cashdeskFilters.to = today;
            break;
        case 'yesterday':
            const yesterday = getYesterday();
            cashdeskFilters.from = yesterday;
            cashdeskFilters.to = yesterday;
            break;
        case 'week':
            cashdeskFilters.from = getWeekStart();
            cashdeskFilters.to = today;
            break;
        case 'month':
            cashdeskFilters.from = getMonthStart();
            cashdeskFilters.to = today;
            break;
    }
    
    // Update inputs
    document.getElementById('cashdeskFrom').value = cashdeskFilters.from;
    document.getElementById('cashdeskTo').value = cashdeskFilters.to;
    
    // Reload data
    loadCashdeskData();
}

// ===== DATA LOADING =====
async function loadCashdeskData() {
    const from = document.getElementById('cashdeskFrom').value || getToday();
    const to = document.getElementById('cashdeskTo').value || getToday();
    
    cashdeskFilters.from = from;
    cashdeskFilters.to = to;
    
    try {
        // Load summary and charges in parallel
        const [summary, chargesData] = await Promise.all([
            apiGet(`cashdesk-summary?from=${from}&to=${to}`),
            apiGet(`cashdesk-charges?from=${from}&to=${to}`)
        ]);
        
        cashdeskData.summary = summary;
        cashdeskData.charges = chargesData.charges || [];
        
        renderCashdeskSummary();
        renderCashdeskTable();
        
    } catch (err) {
        console.error('Error loading cashdesk data:', err);
        showToast('Chyba pri načítaní pokladne', 'error');
    }
}

// ===== RENDER SUMMARY CARDS =====
function renderCashdeskSummary() {
    const summary = cashdeskData.summary;
    if (!summary) return;
    
    const formatEur = (cents) => (cents / 100).toFixed(2) + ' €';
    
    const methodLabels = {
        cash: 'Hotovosť',
        card: 'Karta',
        bank: 'Prevod',
        other: 'Iné'
    };
    
    const methodIcons = {
        cash: '💵',
        card: '💳',
        bank: '🏦',
        other: '📋'
    };
    
    let cardsHtml = '';
    
    // Total card
    cardsHtml += `
        <div class="stat-card" style="background: linear-gradient(135deg, #10b981, #059669);">
            <div class="stat-icon">💰</div>
            <div class="stat-value" style="color: white;">${formatEur(summary.total_paid_cents)}</div>
            <div class="stat-label" style="color: rgba(255,255,255,0.9);">Celkom (${summary.count_paid} platieb)</div>
        </div>
    `;
    
    // Method cards
    for (const method of ['cash', 'card', 'bank', 'other']) {
        const amount = summary.totals_by_method[method] || 0;
        if (amount > 0 || method !== 'other') {
            cardsHtml += `
                <div class="stat-card">
                    <div class="stat-icon">${methodIcons[method]}</div>
                    <div class="stat-value">${formatEur(amount)}</div>
                    <div class="stat-label">${methodLabels[method]}</div>
                </div>
            `;
        }
    }
    
    document.getElementById('cashdeskSummaryCards').innerHTML = cardsHtml;
}

// ===== RENDER TABLE =====
function renderCashdeskTable() {
    const search = (document.getElementById('cashdeskSearch')?.value || '').toLowerCase();
    cashdeskFilters.search = search;
    
    let charges = cashdeskData.charges || [];
    
    // Filter by search
    if (search) {
        charges = charges.filter(c => {
            const riderName = c.rider?.full_name?.toLowerCase() || '';
            const horseName = c.horse?.name?.toLowerCase() || '';
            const ref = (c.paid_reference || '').toLowerCase();
            const refCode = (c.reference_code || '').toLowerCase();
            return riderName.includes(search) || horseName.includes(search) || 
                   ref.includes(search) || refCode.includes(search);
        });
    }
    
    if (charges.length === 0) {
        document.getElementById('cashdeskTableBody').innerHTML = `
            <tr><td colspan="7" class="text-center text-gray">Žiadne platby v tomto období</td></tr>
        `;
        return;
    }
    
    const formatEur = (cents) => (cents / 100).toFixed(2) + ' €';
    const formatTime = (dt) => {
        if (!dt) return '-';
        const d = new Date(dt);
        return d.toLocaleString('sk-SK', { 
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit' 
        });
    };
    
    const methodLabels = {
        cash: 'Hotovosť',
        card: 'Karta',
        bank: 'Prevod'
    };
    
    let html = '';
    for (const c of charges) {
        const riderName = c.rider?.full_name || '-';
        const horseName = c.horse?.name || '-';
        const method = methodLabels[c.paid_method] || c.paid_method || '-';
        
        html += `
            <tr>
                <td>${formatTime(c.paid_at)}</td>
                <td>${riderName}</td>
                <td>${horseName}</td>
                <td><strong>${formatEur(c.amount_cents)}</strong></td>
                <td>${method}</td>
                <td>${c.paid_reference || c.reference_code || '-'}</td>
                <td>${c.note || '-'}</td>
            </tr>
        `;
    }
    
    document.getElementById('cashdeskTableBody').innerHTML = html;
}

// ===== EXPORT CSV =====
function exportCashdeskCSV() {
    const charges = cashdeskData.charges || [];
    if (charges.length === 0) {
        showToast('Žiadne dáta na export', 'error');
        return;
    }
    
    const formatEur = (cents) => (cents / 100).toFixed(2);
    
    // CSV header
    let csv = 'Dátum platby;Jazdec;Kôň;Suma (€);Spôsob;Referencia;Poznámka\n';
    
    // CSV rows
    for (const c of charges) {
        const paidAt = c.paid_at ? new Date(c.paid_at).toLocaleString('sk-SK') : '';
        const rider = c.rider?.full_name || '';
        const horse = c.horse?.name || '';
        const amount = formatEur(c.amount_cents);
        const method = c.paid_method || '';
        const ref = c.paid_reference || c.reference_code || '';
        const note = (c.note || '').replace(/;/g, ',').replace(/\n/g, ' ');
        
        csv += `${paidAt};${rider};${horse};${amount};${method};${ref};${note}\n`;
    }
    
    // Add summary row
    const summary = cashdeskData.summary;
    if (summary) {
        csv += `\n;;CELKOM;${formatEur(summary.total_paid_cents)};;;\n`;
        csv += `;;Hotovosť;${formatEur(summary.totals_by_method.cash)};;;\n`;
        csv += `;;Karta;${formatEur(summary.totals_by_method.card)};;;\n`;
        csv += `;;Prevod;${formatEur(summary.totals_by_method.bank)};;;\n`;
    }
    
    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pokladna_${cashdeskFilters.from}_${cashdeskFilters.to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('CSV exportované', 'success');
}

// ===== INIT =====
function initCashdesk() {
    // Set default dates to today
    const today = getToday();
    document.getElementById('cashdeskFrom').value = today;
    document.getElementById('cashdeskTo').value = today;
    
    // Load data
    loadCashdeskData();
}

// Auto-init when section becomes visible
document.addEventListener('DOMContentLoaded', () => {
    // Will be called when navigating to cashdesk section
});
