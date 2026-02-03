/**
 * JKZM Layout System v6.21.14
 * Jednotný header/footer pre všetky verejné stránky
 */

(function() {
    'use strict';

    // Konfigurácia
    const HEADER_PATH = '/partials/header.html';
    const FOOTER_PATH = '/partials/footer.html';

    /**
     * Načíta HTML súbor
     */
    async function fetchPartial(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                console.warn(`Layout: Failed to load ${path}`);
                return null;
            }
            return await response.text();
        } catch (error) {
            console.warn(`Layout: Error loading ${path}:`, error);
            return null;
        }
    }

    /**
     * Vloží header a footer do stránky
     */
    async function injectLayout() {
        const headerContainer = document.getElementById('site-header');
        const footerContainer = document.getElementById('site-footer');

        // Načítaj paralelne
        const [headerHTML, footerHTML] = await Promise.all([
            headerContainer ? fetchPartial(HEADER_PATH) : null,
            footerContainer ? fetchPartial(FOOTER_PATH) : null
        ]);

        // Vlož header
        if (headerContainer && headerHTML) {
            headerContainer.innerHTML = headerHTML;
            highlightCurrentNav();
        }

        // Vlož footer
        if (footerContainer && footerHTML) {
            footerContainer.innerHTML = footerHTML;
            bindFooterActions();
        }
    }

    /**
     * Zvýrazni aktuálnu položku v navigácii
     */
    function highlightCurrentNav() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('#site-header nav a, #mainNav a');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            // Presná zhoda alebo domov pre /
            if (href === currentPath || 
                (href === '/' && currentPath === '/') ||
                (href !== '/' && currentPath.startsWith(href) && !href.startsWith('/#'))) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Nastav event handlery pre footer akcie
     */
    function bindFooterActions() {
        // Cookie settings links
        const cookieLinks = document.querySelectorAll('.cookie-settings-trigger, #cookieSettingsLink');
        
        cookieLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                openCookieSettings();
            });
        });
    }

    /**
     * Otvor nastavenia cookies
     */
    function openCookieSettings() {
        if (window.JKZMConsent && typeof window.JKZMConsent.openSettings === 'function') {
            window.JKZMConsent.openSettings();
        } else {
            // Fallback ak consent systém nie je načítaný
            console.warn('Cookie consent system not available');
            alert('Nastavenia cookies nie sú momentálne dostupné. Skúste obnoviť stránku.');
        }
    }

    /**
     * Mobile menu toggle
     */
    window.toggleMenu = function() {
        const nav = document.getElementById('mainNav');
        if (nav) {
            nav.classList.toggle('open');
        }
    };

    /**
     * Inicializácia po načítaní DOM
     */
    function init() {
        injectLayout();
    }

    // Spusti po DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exportuj pre prípadné manuálne použitie
    window.JKZMLayout = {
        injectLayout: injectLayout,
        highlightCurrentNav: highlightCurrentNav,
        openCookieSettings: openCookieSettings
    };

})();
