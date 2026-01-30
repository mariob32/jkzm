// ===== JKZM Admin - App Router & Init =====
// app.js - hlavná logika aplikácie

// Global data stores (pre kompatibilitu s existujúcim kódom)
let horses = [], riders = [], trainers = [], employees = [];
let trainings = [], vetRecords = [], payments = [], bookings = [], messages = [], competitions = [];
let vaccinations = [], notifications = [], tasks = [], auditLogs = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
    const token = getToken();
    if (token) {
        showApp();
        loadAll();
    } else {
        showLogin();
    }
});

function showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('sk-SK', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    
    // Načítať sekciu z URL hash
    setTimeout(loadSectionFromHash, 200);
}

function logout() {
    clearToken();
    location.reload();
}

// ===== LOGIN =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('loginEmail').value,
                    password: document.getElementById('loginPassword').value
                })
            });
            const data = await res.json();
            if (data.token) {
                setToken(data.token);
                showApp();
                loadAll();
            } else {
                showToast(data.error || 'Nesprávne prihlasovacie údaje', 'error');
            }
        } catch(e) {
            showToast('Chyba pripojenia', 'error');
        }
    });
}

// ===== NAVIGATION =====
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => showSection(item.dataset.section));
});

function showSection(section) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(section)?.classList.add('active');
    window.location.hash = section;
}

function loadSectionFromHash() {
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showSection(hash);
        loadSectionData(hash);
    }
}

function loadSectionData(hash) {
    // Existujúce sekcie
    if (hash === 'tasks') setTimeout(loadTasks, 100);
    if (hash === 'notifications') setTimeout(loadNotifications, 100);
    if (hash === 'audit-trail') { setTimeout(initAuditFilters, 100); setTimeout(loadAuditLogs, 150); }
    if (hash === 'exports') { setTimeout(() => showExportTab('stable-log'), 100); setTimeout(loadOfficialExports, 150); }
    if (hash === 'articles') setTimeout(loadArticles, 100);
    if (hash === 'gallery') setTimeout(loadAlbums, 100);
    if (hash === 'pages') setTimeout(loadPages, 100);
    if (hash === 'documents') setTimeout(loadDocuments, 100);
    if (hash === 'partners') setTimeout(loadPartners, 100);
    if (hash === 'services') setTimeout(loadServices, 100);
    if (hash === 'web-settings') setTimeout(loadSettings, 100);
    
    // MVP Stajňa sekcie
    if (hash === 'stable-horses') setTimeout(loadStableHorses, 100);
    if (hash === 'stable-trainings') {
        setTimeout(loadStableHorses, 100);
        setTimeout(loadStableTrainings, 150);
    }
    if (hash === 'stable-health') {
        setTimeout(loadStableHorses, 100);
        setTimeout(loadHealthEvents, 150);
    }
    if (hash === 'stable-feed') {
        setTimeout(loadStableHorses, 100);
        setTimeout(loadFeedLogs, 150);
    }
    
    // Web Posts
    if (hash === 'web-posts') setTimeout(loadWebPosts, 100);
    
    // Cashdesk / Pokladňa
    if (hash === 'cashdesk') setTimeout(initCashdesk, 100);
}

// ===== LOAD ALL DATA =====
async function loadAll() {
    console.log('Loading all data...');
    try {
        const results = await Promise.allSettled([
            api('horses'), api('riders'), api('trainers'), api('employees'),
            api('trainings'), api('vet-records'), api('payments'),
            api('bookings'), api('contact'), api('competitions')
        ]);
        
        const getValue = (result) => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                return result.value;
            }
            return [];
        };
        
        horses = getValue(results[0]);
        riders = getValue(results[1]);
        trainers = getValue(results[2]);
        employees = getValue(results[3]);
        trainings = getValue(results[4]);
        vetRecords = getValue(results[5]);
        payments = getValue(results[6]);
        bookings = getValue(results[7]);
        messages = getValue(results[8]);
        competitions = getValue(results[9]);
        
        console.log('Loaded: horses=' + horses.length + ', riders=' + riders.length);
    } catch(e) {
        console.error('loadAll error:', e);
        horses = []; riders = []; trainers = []; employees = [];
        trainings = []; vetRecords = []; payments = [];
        bookings = []; messages = []; competitions = [];
    }
    
    renderAll();
    loadDashboard();
    populateSelects();
}

// Placeholder functions - tieto existujú v hlavnom index.html
function renderAll() {
    if (typeof renderHorses === 'function') renderHorses();
    if (typeof renderRiders === 'function') renderRiders();
    if (typeof renderTrainers === 'function') renderTrainers();
    if (typeof renderEmployees === 'function') renderEmployees();
    if (typeof renderTrainings === 'function') renderTrainings();
    if (typeof renderPayments === 'function') renderPayments();
    if (typeof renderBookings === 'function') renderBookings();
    if (typeof renderMessages === 'function') renderMessages();
    if (typeof renderCompetitions === 'function') renderCompetitions();
}

function loadDashboard() {
    const statHorses = document.getElementById('statHorses');
    const statRiders = document.getElementById('statRiders');
    const statTrainings = document.getElementById('statTrainings');
    const statAlerts = document.getElementById('statAlerts');
    
    if (statHorses) statHorses.textContent = horses.filter(h => h.status === 'active' || h.is_active !== false).length;
    if (statRiders) statRiders.textContent = riders.filter(r => r.status === 'active' || r.is_active !== false).length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayTrainings = trainings.filter(t => t.date === today || t.training_date === today);
    if (statTrainings) statTrainings.textContent = todayTrainings.length;
    
    // Alerts
    let alertCount = 0;
    const now = new Date();
    const in30days = new Date(now.getTime() + 30*24*60*60*1000);
    
    horses.forEach(h => {
        if (h.sjf_license_valid_until && new Date(h.sjf_license_valid_until) < in30days) {
            alertCount++;
        }
    });
    
    if (statAlerts) statAlerts.textContent = alertCount;
    const alertBadge = document.getElementById('alertBadge');
    if (alertBadge) alertBadge.textContent = alertCount;
}

function populateSelects() {
    // Základné selecty pre kone
    const horseSelects = document.querySelectorAll('select[id*="Horse"]:not([id*="Filter"])');
    horseSelects.forEach(sel => {
        if (sel.id.includes('stable') || sel.id.includes('MVP')) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">-- Vyberte koňa --</option>';
        horses.forEach(h => {
            const name = h.name || h.stable_name || 'Bez mena';
            sel.innerHTML += `<option value="${h.id}">${name}</option>`;
        });
        if (current) sel.value = current;
    });
    
    // Rider selects
    const riderSelects = document.querySelectorAll('select[id*="Rider"]:not([id*="Filter"])');
    riderSelects.forEach(sel => {
        if (sel.id.includes('stable') || sel.id.includes('MVP')) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">-- Vyberte jazdca --</option>';
        riders.forEach(r => {
            const name = r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim();
            sel.innerHTML += `<option value="${r.id}">${name}</option>`;
        });
        if (current) sel.value = current;
    });
}

// Export to window
if (typeof window !== 'undefined') {
    window.showLogin = showLogin;
    window.showApp = showApp;
    window.logout = logout;
    window.showSection = showSection;
    window.loadSectionFromHash = loadSectionFromHash;
    window.loadSectionData = loadSectionData;
    window.loadAll = loadAll;
    window.loadDashboard = loadDashboard;
    window.populateSelects = populateSelects;
    window.renderAll = renderAll;
}
