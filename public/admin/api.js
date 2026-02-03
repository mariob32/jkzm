// ===== JKZM Admin API Helper v6.21.14 =====
// api.js - základné funkcie pre API volania

const API_BASE = '/api';

// Loading state management
let isApiLoading = false;
const loadingCallbacks = [];

function getToken() {
    return localStorage.getItem('jkzm_token');
}

function setToken(token) {
    localStorage.setItem('jkzm_token', token);
}

function clearToken() {
    localStorage.removeItem('jkzm_token');
}

function getHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/**
 * Nastaví loading stav a notifikuje subscribery
 */
function setLoadingState(loading) {
    isApiLoading = loading;
    loadingCallbacks.forEach(cb => cb(loading));
    
    // Automaticky disable/enable save tlačidlá v modaloch
    document.querySelectorAll('.modal.active .btn-primary').forEach(btn => {
        if (loading) {
            btn.dataset.originalText = btn.textContent;
            btn.textContent = 'Ukladám...';
            btn.disabled = true;
        } else {
            if (btn.dataset.originalText) {
                btn.textContent = btn.dataset.originalText;
                delete btn.dataset.originalText;
            }
            btn.disabled = false;
        }
    });
}

/**
 * Pridaj callback pre loading state zmeny
 */
function onLoadingChange(callback) {
    loadingCallbacks.push(callback);
    return () => {
        const idx = loadingCallbacks.indexOf(callback);
        if (idx > -1) loadingCallbacks.splice(idx, 1);
    };
}

/**
 * Skontroluj či API práve beží
 */
function isLoading() {
    return isApiLoading;
}

async function fetchJson(endpoint, method = 'GET', body = null) {
    const opts = {
        method,
        headers: getHeaders()
    };
    if (body && method !== 'GET') {
        opts.body = JSON.stringify(body);
    }
    
    // Nastav loading pre non-GET requesty
    const isModifying = method !== 'GET';
    if (isModifying) setLoadingState(true);
    
    try {
        console.log(`API ${method} ${endpoint}`, body ? body : '');
        const res = await fetch(`${API_BASE}/${endpoint}`, opts);
        
        // Skontroluj či odpoveď je JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error(`API error - not JSON:`, text.substring(0, 500));
            throw new Error('Server nevrátil JSON odpoveď');
        }
        
        const data = await res.json();
        console.log(`API ${method} ${endpoint} response:`, res.status, data);
        
        // Ak je 401, presmeruj na login
        if (res.status === 401) {
            showToast('Neautorizované - prihláste sa znova', 'error');
            clearToken();
            setTimeout(() => location.reload(), 1500);
            throw new Error('Unauthorized');
        }
        
        // Ak je error v response
        if (!res.ok && data.error) {
            const errorMsg = data.error + (data.details ? ': ' + data.details : '');
            showToast(errorMsg, 'error');
            throw new Error(errorMsg);
        }
        
        return data;
    } catch (error) {
        console.error(`API error [${method} ${endpoint}]:`, error);
        // Zobraz chybu ak ešte nebola zobrazená
        if (error.message && !error.message.includes('Unauthorized')) {
            // showToast sa volá už vyššie, ale pre network errors:
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                showToast('Chyba siete - skontrolujte pripojenie', 'error');
            }
        }
        throw error;
    } finally {
        if (isModifying) setLoadingState(false);
    }
}

// Convenience methods
async function apiGet(endpoint) {
    return fetchJson(endpoint, 'GET');
}

async function apiPost(endpoint, data) {
    return fetchJson(endpoint, 'POST', data);
}

async function apiPatch(endpoint, data) {
    return fetchJson(endpoint, 'PATCH', data);
}

async function apiPut(endpoint, data) {
    return fetchJson(endpoint, 'PUT', data);
}

async function apiDelete(endpoint) {
    return fetchJson(endpoint, 'DELETE');
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log(`Toast [${type}]:`, message);
        return;
    }
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => { toast.className = 'toast'; }, 4000);
}

// Modal helpers
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// Alias pre kompatibilitu
async function api(endpoint, method = 'GET', body = null) {
    return fetchJson(endpoint, method, body);
}

// Export for modules
if (typeof window !== 'undefined') {
    window.api = api;
    window.apiGet = apiGet;
    window.apiPost = apiPost;
    window.apiPatch = apiPatch;
    window.apiPut = apiPut;
    window.apiDelete = apiDelete;
    window.fetchJson = fetchJson;
    window.getToken = getToken;
    window.setToken = setToken;
    window.clearToken = clearToken;
    window.showToast = showToast;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.isLoading = isLoading;
    window.onLoadingChange = onLoadingChange;
}
