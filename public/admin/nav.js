// ===== JKZM Admin Navigation v6.21.5 =====
// nav.js - accordion menu + favorites

// ===== MENU DEFINITION =====
const ADMIN_NAV = [
    // ===== KLUB MOD =====
    {
        id: 'overview',
        title: 'Prehlad',
        mode: 'club',
        items: [
            { id: 'dashboard', icon: '📊', label: 'Prehlad', badge: 'alertBadge' },
            { id: 'tasks', icon: '✓', label: 'Ulohy', badge: 'tasksBadge' },
            { id: 'notifications', icon: '🔔', label: 'Upozornenia' }
        ]
    },
    {
        id: 'evidence',
        title: 'Evidencia',
        mode: 'club',
        items: [
            { id: 'horses', icon: '🐴', label: 'Kone' },
            { id: 'riders', icon: '🏇', label: 'Jazdci' },
            { id: 'trainers', icon: '👨‍🏫', label: 'Treneri' },
            { id: 'employees', icon: '👷', label: 'Zamestnanci' }
        ]
    },
    {
        id: 'trainings',
        title: 'Treningy',
        mode: 'club',
        items: [
            { id: 'training-calendar', icon: '📅', label: 'Kalendar' },
            { id: 'bookings', icon: '🎯', label: 'Rezervacie' },
            { id: 'trainings', icon: '📝', label: 'Zaznamy treningov' },
            { id: 'arenas', icon: '🏟️', label: 'Areny a casy' }
        ]
    },
    {
        id: 'stable',
        title: 'Stajna',
        mode: 'club',
        items: [
            { id: 'feeding', icon: '🌾', label: 'Krmenie' },
            { id: 'vet', icon: '🏥', label: 'Zdravie / Veterina' },
            { id: 'stable-log', icon: '📖', label: 'Mastalna kniha' },
            { id: 'visit-log', icon: '📋', label: 'Navstevna kniha' }
        ]
    },
    {
        id: 'finance',
        title: 'Financie',
        mode: 'club',
        items: [
            { id: 'billing', icon: '💰', label: 'Platby' },
            { id: 'cashdesk', icon: '🧾', label: 'Pokladňa' },
            { id: 'pricing-rules', icon: '📋', label: 'Cennik' },
            { id: 'billing-reports', icon: '📊', label: 'Reporty' }
        ]
    },
    {
        id: 'sport',
        title: 'Sport',
        mode: 'club',
        items: [
            { id: 'competitions', icon: '🏆', label: 'Preteky' },
            { id: 'licenses', icon: '📋', label: 'Licencie SJF / FEI' },
            { id: 'sjf-register', icon: '🏛️', label: 'SJF Register' }
        ]
    },

    // ===== WEB MOD =====
    {
        id: 'web',
        title: 'Web',
        mode: 'web',
        items: [
            { id: 'web-posts', icon: '📝', label: 'Novinky' },
            { id: 'messages', icon: '✉️', label: 'Spravy' },
            { id: 'articles', icon: '📰', label: 'Clanky' },
            { id: 'gallery', icon: '🖼️', label: 'Galeria' },
            { id: 'pages', icon: '📄', label: 'Stranky' },
            { id: 'documents', icon: '📎', label: 'Dokumenty webu' },
            { id: 'partners', icon: '🤝', label: 'Partneri' }
        ]
    },

    // ===== SYSTEM (OBA MODY) =====
    {
        id: 'system',
        title: 'System',
        mode: 'both',
        items: [
            { id: 'compliance', icon: '🛡️', label: 'Compliance' },
            { id: 'audit-trail', icon: '📋', label: 'Audit trail' },
            { id: 'exports', icon: '📄', label: 'Exporty' },
            { id: 'admin-users', icon: '👤', label: 'Admin pouzivatelia' },
            { id: 'web-settings', icon: '⚙️', label: 'Nastavenia' }
        ]
    }
];

// ===== STORAGE KEYS =====
const ADMIN_MODE_KEY = 'jkzm_admin_mode';
const ADMIN_FAVORITES_KEY = 'jkzm_admin_favorites';
const ADMIN_OPEN_SECTION_KEY = 'jkzm_admin_open_section';
const DEFAULT_MODE = 'club';
const DEFAULT_FAVORITES = ['training-calendar', 'billing', 'pricing-rules', 'feeding'];

// ===== MODE MANAGEMENT =====
function getAdminMode() {
    return localStorage.getItem(ADMIN_MODE_KEY) || DEFAULT_MODE;
}

function setAdminMode(mode) {
    localStorage.setItem(ADMIN_MODE_KEY, mode);
    renderNav();
    updateModeButtons();
}

function updateModeButtons() {
    const mode = getAdminMode();
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

// ===== FAVORITES MANAGEMENT =====
function getFavorites() {
    const stored = localStorage.getItem(ADMIN_FAVORITES_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return DEFAULT_FAVORITES;
        }
    }
    // Set default favorites on first load
    localStorage.setItem(ADMIN_FAVORITES_KEY, JSON.stringify(DEFAULT_FAVORITES));
    return DEFAULT_FAVORITES;
}

function setFavorites(favorites) {
    localStorage.setItem(ADMIN_FAVORITES_KEY, JSON.stringify(favorites));
}

function toggleFavorite(itemId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(itemId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        if (favorites.length < 5) {
            favorites.push(itemId);
        } else {
            showToast('Maximum 5 oblubenych poloziek', 'warning');
            return;
        }
    }
    setFavorites(favorites);
    renderNav(document.getElementById('navSearch')?.value || '');
}

function isFavorite(itemId) {
    return getFavorites().includes(itemId);
}

// ===== ACCORDION MANAGEMENT =====
function getOpenSection() {
    return localStorage.getItem(ADMIN_OPEN_SECTION_KEY) || 'overview';
}

function setOpenSection(sectionId) {
    localStorage.setItem(ADMIN_OPEN_SECTION_KEY, sectionId);
}

function toggleSection(sectionId) {
    const current = getOpenSection();
    if (current === sectionId) {
        // Already open - keep it open (no collapse all)
        return;
    }
    setOpenSection(sectionId);
    renderNav(document.getElementById('navSearch')?.value || '');
}

// ===== HELPERS =====
function getCurrentSection() {
    const hash = window.location.hash.slice(1);
    return hash || 'dashboard';
}

function getAllItems() {
    const items = [];
    ADMIN_NAV.forEach(group => {
        group.items.forEach(item => {
            items.push({ ...item, groupId: group.id, mode: group.mode });
        });
    });
    return items;
}

function getItemById(itemId) {
    return getAllItems().find(item => item.id === itemId);
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

// ===== RENDER =====
function renderNav(searchTerm = '') {
    const navContainer = document.getElementById('dynamicNav');
    if (!navContainer) return;

    const mode = getAdminMode();
    const favorites = getFavorites();
    const openSectionId = getOpenSection();
    const currentSection = getCurrentSection();
    const isSearching = searchTerm.trim().length > 0;

    let html = '';

    // ===== FAVORITES SECTION =====
    const favoriteItems = favorites
        .map(id => getItemById(id))
        .filter(item => item && (item.mode === mode || item.mode === 'both'))
        .filter(item => !searchTerm || item.label.toLowerCase().includes(searchTerm.toLowerCase()));

    if (favoriteItems.length > 0) {
        html += `<div class="nav-section nav-section-favorites">`;
        html += `<div class="nav-section-title">
            <span>Oblubene</span>
        </div>`;
        html += `<div class="nav-section-items">`;
        
        favoriteItems.forEach(item => {
            const isActive = item.id === currentSection ? ' active' : '';
            const badge = item.badge ? `<span class="badge" id="${item.badge}">0</span>` : '';
            html += `
                <div class="nav-item${isActive}" data-section="${item.id}">
                    <span class="icon">${item.icon}</span>
                    <span class="nav-item-label">${item.label}</span>
                    ${badge}
                    <span class="nav-favorite-star active" data-item="${item.id}" title="Odstranit z oblubenych">★</span>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }

    // ===== REGULAR SECTIONS (ACCORDION) =====
    const filteredNav = getFilteredNav(mode, searchTerm);
    
    filteredNav.forEach(group => {
        if (group.items.length === 0) return;

        const isOpen = isSearching || group.id === openSectionId;
        const openClass = isOpen ? ' open' : '';

        html += `<div class="nav-section nav-section-accordion${openClass}" data-group="${group.id}">`;
        html += `<div class="nav-section-title" onclick="toggleSection('${group.id}')">
            <span>${group.title}</span>
            <span class="nav-section-arrow">${isOpen ? '▼' : '▶'}</span>
        </div>`;
        html += `<div class="nav-section-items"${isOpen ? '' : ' style="display:none"'}>`;
        
        group.items.forEach(item => {
            const isActive = item.id === currentSection ? ' active' : '';
            const isFav = isFavorite(item.id);
            const starClass = isFav ? ' active' : '';
            const badge = item.badge ? `<span class="badge" id="${item.badge}">0</span>` : '';
            
            html += `
                <div class="nav-item${isActive}" data-section="${item.id}">
                    <span class="icon">${item.icon}</span>
                    <span class="nav-item-label">${item.label}</span>
                    ${badge}
                    <span class="nav-favorite-star${starClass}" data-item="${item.id}" title="${isFav ? 'Odstranit z oblubenych' : 'Pridat do oblubenych'}">${isFav ? '★' : '☆'}</span>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });

    navContainer.innerHTML = html;
    attachNavClickHandlers();
}

// ===== EVENT HANDLERS =====
function attachNavClickHandlers() {
    // Navigation clicks
    document.querySelectorAll('#dynamicNav .nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            // Check if clicked on star
            if (e.target.classList.contains('nav-favorite-star')) {
                e.stopPropagation();
                const itemId = e.target.dataset.item;
                toggleFavorite(itemId);
                return;
            }
            
            const section = item.dataset.section;
            navigateTo(section);
        });
    });

    // Star clicks (backup handler)
    document.querySelectorAll('#dynamicNav .nav-favorite-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemId = star.dataset.item;
            toggleFavorite(itemId);
        });
    });
}

function handleNavSearch(e) {
    const term = e.target.value;
    renderNav(term);
}

// ===== INITIALIZATION =====
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

// ===== EXPORTS =====
if (typeof window !== 'undefined') {
    window.ADMIN_NAV = ADMIN_NAV;
    window.getAdminMode = getAdminMode;
    window.setAdminMode = setAdminMode;
    window.getFavorites = getFavorites;
    window.setFavorites = setFavorites;
    window.toggleFavorite = toggleFavorite;
    window.toggleSection = toggleSection;
    window.renderNav = renderNav;
    window.initAdminNav = initAdminNav;
}
