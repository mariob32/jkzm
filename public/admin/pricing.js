// ===== JKZM Admin - Pricing Rules =====
// pricing.js - správa cenových pravidiel

let pricingRules = [];

// ===== LOAD RULES =====
async function loadPricingRules() {
    try {
        const json = await apiGet('pricing-rules?active_only=false');
        pricingRules = json.data || [];
        renderPricingRules();
    } catch(e) {
        console.error('Load pricing rules error:', e);
        showToast('Chyba pri načítaní cenníka', 'error');
    }
}

function formatCentsInput(cents) {
    return (cents / 100).toFixed(2);
}

// ===== RENDER =====
function renderPricingRules() {
    const table = document.getElementById('pricingRulesTable');
    if (!table) return;

    if (!pricingRules.length) {
        table.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray)">Žiadne pravidlá. Vytvorte prvé.</td></tr>';
        return;
    }

    table.innerHTML = pricingRules.map(r => {
        const riderName = r.rider ? `${r.rider.first_name || ''} ${r.rider.last_name || ''}`.trim() : '-';
        const horseName = r.horse?.name || '-';
        const durationRange = (r.min_duration_min || r.max_duration_min) 
            ? `${r.min_duration_min || '?'}-${r.max_duration_min || '?'} min` 
            : '-';
        
        return `
            <tr style="${!r.is_active ? 'opacity:0.5' : ''}">
                <td><strong>${r.name}</strong></td>
                <td>${r.priority}</td>
                <td>${r.discipline || 'všetky'}</td>
                <td>${durationRange}</td>
                <td>${formatCentsInput(r.base_amount_cents)} €</td>
                <td>${r.per_minute_cents > 0 ? formatCentsInput(r.per_minute_cents) + ' €/min' : '-'}</td>
                <td><span class="badge badge-${r.is_active ? 'success' : 'gray'}">${r.is_active ? 'Aktívne' : 'Neaktívne'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editPricingRule('${r.id}')" title="Upraviť">Upraviť</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePricingRule('${r.id}')" title="Zmazať">X</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== CREATE/EDIT =====
function openNewPricingRuleModal() {
    document.getElementById('pricingRuleForm').reset();
    document.getElementById('pricingRuleId').value = '';
    document.getElementById('pricingRuleModalTitle').textContent = 'Nové cenové pravidlo';
    document.getElementById('pricingRuleIsActive').checked = true;
    document.getElementById('pricingRulePriority').value = '100';
    
    populatePricingRuleSelects();
    openModal('pricingRuleModal');
}

function editPricingRule(id) {
    const rule = pricingRules.find(r => r.id === id);
    if (!rule) return;

    document.getElementById('pricingRuleId').value = rule.id;
    document.getElementById('pricingRuleName').value = rule.name;
    document.getElementById('pricingRuleIsActive').checked = rule.is_active;
    document.getElementById('pricingRulePriority').value = rule.priority;
    document.getElementById('pricingRuleDiscipline').value = rule.discipline || '';
    document.getElementById('pricingRuleMinDuration').value = rule.min_duration_min || '';
    document.getElementById('pricingRuleMaxDuration').value = rule.max_duration_min || '';
    document.getElementById('pricingRuleRider').value = rule.rider_id || '';
    document.getElementById('pricingRuleHorse').value = rule.horse_id || '';
    document.getElementById('pricingRuleBaseAmount').value = formatCentsInput(rule.base_amount_cents);
    document.getElementById('pricingRulePerMinute').value = formatCentsInput(rule.per_minute_cents);
    
    document.getElementById('pricingRuleModalTitle').textContent = 'Upraviť pravidlo';
    populatePricingRuleSelects();
    openModal('pricingRuleModal');
}

function populatePricingRuleSelects() {
    const riderSel = document.getElementById('pricingRuleRider');
    const horseSel = document.getElementById('pricingRuleHorse');
    
    if (riderSel && typeof riders !== 'undefined') {
        const currentValue = riderSel.value;
        riderSel.innerHTML = '<option value="">-- Všetci --</option>';
        riders.forEach(r => {
            const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Bez mena';
            riderSel.innerHTML += `<option value="${r.id}">${name}</option>`;
        });
        riderSel.value = currentValue;
    }

    if (horseSel && typeof horses !== 'undefined') {
        const currentValue = horseSel.value;
        horseSel.innerHTML = '<option value="">-- Všetky --</option>';
        horses.forEach(h => {
            horseSel.innerHTML += `<option value="${h.id}">${h.name || h.stable_name}</option>`;
        });
        horseSel.value = currentValue;
    }
}

async function savePricingRule() {
    const id = document.getElementById('pricingRuleId').value;
    const name = document.getElementById('pricingRuleName').value.trim();
    const isActive = document.getElementById('pricingRuleIsActive').checked;
    const priority = parseInt(document.getElementById('pricingRulePriority').value) || 100;
    const discipline = document.getElementById('pricingRuleDiscipline').value || null;
    const minDuration = document.getElementById('pricingRuleMinDuration').value;
    const maxDuration = document.getElementById('pricingRuleMaxDuration').value;
    const riderId = document.getElementById('pricingRuleRider').value || null;
    const horseId = document.getElementById('pricingRuleHorse').value || null;
    const baseAmount = parseFloat(document.getElementById('pricingRuleBaseAmount').value) || 0;
    const perMinute = parseFloat(document.getElementById('pricingRulePerMinute').value) || 0;

    if (!name) {
        showToast('Názov je povinný', 'error');
        return;
    }

    const data = {
        name,
        is_active: isActive,
        priority,
        discipline,
        min_duration_min: minDuration ? parseInt(minDuration) : null,
        max_duration_min: maxDuration ? parseInt(maxDuration) : null,
        rider_id: riderId,
        horse_id: horseId,
        base_amount_cents: Math.round(baseAmount * 100),
        per_minute_cents: Math.round(perMinute * 100)
    };

    try {
        if (id) {
            await apiPatch(`pricing-rules/${id}`, data);
            showToast('Pravidlo aktualizované', 'success');
        } else {
            await apiPost('pricing-rules', data);
            showToast('Pravidlo vytvorené', 'success');
        }
        closeModal('pricingRuleModal');
        loadPricingRules();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function deletePricingRule(id) {
    if (!confirm('Naozaj zmazať toto pravidlo?')) return;

    try {
        await apiDelete(`pricing-rules/${id}`);
        showToast('Pravidlo zmazané', 'success');
        loadPricingRules();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

// ===== REPORTS =====
async function loadBillingReport() {
    const from = document.getElementById('reportFrom')?.value || '';
    const to = document.getElementById('reportTo')?.value || '';
    const status = document.getElementById('reportStatus')?.value || 'all';

    try {
        let url = `billing-reports?status=${status}`;
        if (from) url += `&from=${from}`;
        if (to) url += `&to=${to}`;

        const json = await apiGet(url);
        renderBillingReport(json);
    } catch(e) {
        console.error('Load report error:', e);
        showToast('Chyba pri načítaní reportu', 'error');
    }
}

function renderBillingReport(report) {
    const container = document.getElementById('billingReportResult');
    if (!container) return;

    const s = report.summary;
    const formatCents = (c) => (c / 100).toFixed(2) + ' €';

    let html = `
        <div class="card" style="margin-top:1rem">
            <div class="card-header"><h3>Report: ${report.period.from} - ${report.period.to}</h3></div>
            <div class="card-body">
                <p><strong>Celkom položiek:</strong> ${s.total_count}</p>
                <p><strong>Celkom suma:</strong> ${formatCents(s.total_cents)}</p>
                
                <h4 style="margin-top:1rem">Podľa statusu</h4>
                <ul>
                    ${Object.entries(s.by_status).map(([k,v]) => `<li>${k}: ${formatCents(v)}</li>`).join('')}
                </ul>

                ${Object.keys(s.by_method).length > 0 ? `
                    <h4>Podľa spôsobu platby</h4>
                    <ul>
                        ${Object.entries(s.by_method).map(([k,v]) => `<li>${k}: ${formatCents(v)}</li>`).join('')}
                    </ul>
                ` : ''}

                <h4>Podľa disciplíny</h4>
                <ul>
                    ${Object.entries(s.by_discipline).map(([k,v]) => `<li>${k}: ${formatCents(v)}</li>`).join('')}
                </ul>

                ${s.by_rider_top.length > 0 ? `
                    <h4>Top 10 jazdcov</h4>
                    <ol>
                        ${s.by_rider_top.map(r => `<li>${r.rider_name}: ${formatCents(r.total_cents)}</li>`).join('')}
                    </ol>
                ` : ''}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadPricingRules = loadPricingRules;
    window.openNewPricingRuleModal = openNewPricingRuleModal;
    window.editPricingRule = editPricingRule;
    window.savePricingRule = savePricingRule;
    window.deletePricingRule = deletePricingRule;
    window.loadBillingReport = loadBillingReport;
    window.populatePricingRuleSelects = populatePricingRuleSelects;
}
