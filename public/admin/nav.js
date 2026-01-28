// ===== JKZM Admin Navigation v6.21.3 =====
// nav.js - centrálna definícia menu štruktúry (bez duplicít)

const ADMIN_NAV = [
    // ===== KLUB MÓD =====
    {
        id: 'overview',
        title: 'Prehľad',
        mode: 'club',
        items: [
            { section: 'dashboard', icon: '📊', label: 'Dashboard', badge: 'alertBadge' },
            { section: 'tasks', icon: '✓', label: 'Úlohy', badge: 'tasksBadge' },
            { section: 'notifications', icon: '🔔', label: 'Upozornenia' }
        ]
    },
    {
        id: 'evidence',
        title: 'Evidencia',
        mode: 'club',
        items: [
            { section: 'horses', icon: '🐴', label: 'Kone' },
            { section: 'riders', icon: '🏇', label: 'Jazdci' },
            { section: 'trainers', icon: '👨‍🏫', label: 'Tréneri' },
            { section: 'employees', icon: '👷', label: 'Zamestnanci' },
            { section: 'docs-central', icon: '📁', label: 'Dokumenty' }
        ]
    },
    {
        id: 'trainings',
        title: 'Tréningy',
        mode: 'club',
        items: [
            { section: 'training-calendar', icon: '📅', label: 'Kalendár' },
            { section: 'bookings', icon: '🎯', label: 'Rezervácie' },
            { section: 'trainings', icon: '📝', label: 'Záznamy tréningov' },
            { section: 'arenas', icon: '🏟️', label: 'Arény a časy' }
        ]
    },
    {
        id: 'stable',
        title: 'Stajňa',
        mode: 'club',
        items: [
            { section: 'stable-log', icon: '📖', label: 'Maštaľná kniha' },
            { section: 'visit-log', icon: '📋', label: 'Návštevná kniha' },
            { section: 'vet', icon: '🏥', label: 'Veterinárne záznamy' },
            { section: 'feeding', icon: '🌾', label: 'Kŕmenie' }
        ]
    },
    {
        id: 'finance',
        title: 'Financie',
        mode: 'club',
        items: [
            { section: 'billing', icon: '💰', label: 'Účtovanie' },
            { section: 'pricing-rules', icon: '📋', label: 'Cenník' },
            { section: 'billing-reports', icon: '📊', label: 'Finančné reporty' },
            { section: 'payments', icon: '💳', label: 'Platby členov' },
            { section: 'memberships', icon: '🎫', label: 'Členstvá' }
        ]
    },
    {
        id: 'sport',
        title: 'Šport',
        mode: 'club',
        items: [
            { section: 'competitions', icon: '🏆', label: 'Preteky' },
            { section: 'licenses', icon: '📋', label: 'Licencie SJF / FEI' },
            { section: 'sjf-register', icon: '🏛️', label: 'SJF Register' }
        ]
    },

    // ===== WEB MÓD =====
    {
        id: 'web-manage',
        title: 'Web',
        mode: 'web',
        items: [
            { section: 'web-posts', icon: '📝', label: 'Novinky' },
            { section: 'messages', icon: '✉️', label: 'Správy' }
        ]
    },
    {
        id: 'web-content',
        title: 'Obsah webu',
        mode: 'web',
        items: [
            { section: 'articles', icon: '📰', label: 'Články' },
            { section: 'gallery', icon: '🖼️', label: 'Galéria' },
            { section: 'pages', icon: '📄', label: 'Stránky' },
            { section: 'documents', icon: '📎', label: 'Dokumenty webu' },
            { section: 'partners', icon: '🤝', label: 'Partneri' },
            { section: 'services', icon: '🛠️', label: 'Služby' },
            { section: 'web-settings', icon: '⚙️', label: 'Nastavenia' }
        ]
    },

    // ===== SYSTÉM (OBA MÓDY) =====
    {
        id: 'system',
        title: 'Systém',
        mode: 'both',
        items: [
            { section: 'compliance', icon: '🛡️', label: 'Compliance' },
            { section: 'audit-trail', icon: '📋', label: 'Audit trail' },
            { section: 'exports', icon: '📄', label: 'Exporty' },
            { section: 'admin-users', icon: '👤', label: 'Admin používatelia' }
        ]
    }
];

// Mode management
const ADMIN_MODE_KEY = 'jkzm_admin_mode';
const DEFAULT_MODE = 'club';

function getAdminMode() {
    return localStorage.getItem(ADMIN_MODE_KEY) || DEFAULT_MODE;
}

function setAdminMode(mode) {
    localStorage.setItem(ADMIN_MODE_KEY, mode);
    renderNav();
    updateModeButtons();
}

function getFilteredNav(mode, searchTerm = '') {
    const filtered = ADMIN_NAV.filter(group => 
        group.mode === mode || group.mode === 'both'
    );

    if (!searchTerm.trim()) {
        return filtered;
    }

    const term = searchTerm.toLowerCase();
    return filtered.map(group => ({
        ...group,
        items: group.items.filter(item => 
            item.label.toLowerCase().includes(term)
        )
    })).filter(group => group.items.length > 0);
}

function renderNav(searchTerm = '') {
    const navContainer = document.getElementById('dynamicNav');
    if (!navContainer) return;

    const mode = getAdminMode();
    const filteredNav = getFilteredNav(mode, searchTerm);
    const currentSection = getCurrentSection();

    let html = '';
    filteredNav.forEach(group => {
        if (group.items.length === 0) return;

        html += `<div class="nav-section" data-group="${group.id}">`;
        html += `<div class="nav-section-title">${group.title}</div>`;
        
        group.items.forEach(item => {
            const isActive = item.section === currentSection ? ' active' : '';
            const badge = item.badge ? `<span class="badge" id="${item.badge}">0</span>` : '';
            html += `<div class="nav-item${isActive}" data-section="${item.section}">`;
            html += `<span class="icon">${item.icon}</span>${item.label}${badge}`;
            html += `</div>`;
        });
        
        html += `</div>`;
    });

    navContainer.innerHTML = html;
    attachNavClickHandlers();
}

function updateModeButtons() {
    const mode = getAdminMode();
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

function getCurrentSection() {
    const hash = window.location.hash.slice(1);
    return hash || 'dashboard';
}

function attachNavClickHandlers() {
    document.querySelectorAll('#dynamicNav .nav-item[data-section]').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateTo(section);
        });
    });
}

function handleNavSearch(e) {
    const term = e.target.value;
    renderNav(term);
}

// Initialize on load
function initAdminNav() {
    renderNav();
    updateModeButtons();
    
    // Mode button listeners
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setAdminMode(btn.dataset.mode);
        });
    });
    
    // Search input listener
    const searchInput = document.getElementById('navSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleNavSearch);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ADMIN_NAV = ADMIN_NAV;
    window.getAdminMode = getAdminMode;
    window.setAdminMode = setAdminMode;
    window.renderNav = renderNav;
    window.initAdminNav = initAdminNav;
}
