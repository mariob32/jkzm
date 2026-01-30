/**
 * JKZM Cookie/GDPR Consent System
 * Version 1.0
 * 
 * Kategorie:
 * - necessary: vzdy povolene (session, auth, consent)
 * - preferences: uzivatelske nastavenia (favorites, filters)
 * - analytics: Google Analytics, statistiky
 * - marketing: Meta Pixel, remarketing
 */

(function() {
    'use strict';

    // === KONFIGURACIA ===
    const CONSENT_VERSION = '1.0';
    const STORAGE_KEY = 'jkzm_consent';

    // === STAV ===
    let consentData = null;
    let bannerElement = null;
    let modalElement = null;

    // === POMOCNE FUNKCIE ===
    function getStoredConsent() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    }

    function saveConsent(choices) {
        const data = {
            version: CONSENT_VERSION,
            updated_at: new Date().toISOString(),
            choices: {
                preferences: !!choices.preferences,
                analytics: !!choices.analytics,
                marketing: !!choices.marketing
            }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        consentData = data;
        return data;
    }

    function needsConsent() {
        const stored = getStoredConsent();
        if (!stored) return true;
        if (stored.version !== CONSENT_VERSION) return true;
        return false;
    }

    // === SKRIPTY PODLA SUHLASU ===
    function loadAnalytics() {
        // Placeholder pre Google Analytics
        // Po pridani realneho GA ID odkomentovat:
        /*
        if (window.gtag) return; // uz nacitane
        
        const gaId = 'G-XXXXXXXXXX'; // TODO: doplnit realne ID
        
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
        document.head.appendChild(script);
        
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', gaId, { anonymize_ip: true });
        
        console.log('[Consent] Analytics loaded');
        */
        console.log('[Consent] Analytics: pripravene na aktivaciu (GA ID nie je nastavene)');
    }

    function loadMarketing() {
        // Placeholder pre Meta Pixel
        // Po pridani realneho Pixel ID odkomentovat:
        /*
        if (window.fbq) return; // uz nacitane
        
        const pixelId = 'XXXXXXXXXX'; // TODO: doplnit realne ID
        
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', pixelId);
        fbq('track', 'PageView');
        
        console.log('[Consent] Marketing loaded');
        */
        console.log('[Consent] Marketing: pripravene na aktivaciu (Pixel ID nie je nastavene)');
    }

    function applyConsent() {
        const stored = getStoredConsent();
        if (!stored) return;

        if (stored.choices.analytics) {
            loadAnalytics();
        }

        if (stored.choices.marketing) {
            loadMarketing();
        }
    }

    // === UI: BANNER ===
    function createBanner() {
        if (bannerElement) return;

        const banner = document.createElement('div');
        banner.id = 'jkzm-consent-banner';
        banner.innerHTML = `
            <div class="consent-banner-inner">
                <div class="consent-banner-text">
                    <p>Tato webova stranka pouziva cookies a podobne technologie na zabezpecenie jej funkcnosti, 
                    analyzu navstevnosti a personalizaciu obsahu. Viac informacii najdete v nasich 
                    <a href="/cookies" target="_blank">Zasadach pouzivania cookies</a> a 
                    <a href="/privacy" target="_blank">Zasadach ochrany osobnych udajov</a>.</p>
                </div>
                <div class="consent-banner-buttons">
                    <button type="button" class="consent-btn consent-btn-primary" onclick="window.JKZMConsent.acceptAll()">Prijat vsetko</button>
                    <button type="button" class="consent-btn consent-btn-secondary" onclick="window.JKZMConsent.rejectOptional()">Odmietnut volitelne</button>
                    <button type="button" class="consent-btn consent-btn-link" onclick="window.JKZMConsent.openSettings()">Nastavenia</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
        bannerElement = banner;
    }

    function hideBanner() {
        if (bannerElement) {
            bannerElement.remove();
            bannerElement = null;
        }
    }

    // === UI: SETTINGS MODAL ===
    function createModal() {
        if (modalElement) return;

        const stored = getStoredConsent();
        const choices = stored?.choices || { preferences: false, analytics: false, marketing: false };

        const modal = document.createElement('div');
        modal.id = 'jkzm-consent-modal';
        modal.innerHTML = `
            <div class="consent-modal-overlay" onclick="window.JKZMConsent.closeSettings()"></div>
            <div class="consent-modal-content">
                <div class="consent-modal-header">
                    <h3>Nastavenia cookies</h3>
                    <button type="button" class="consent-modal-close" onclick="window.JKZMConsent.closeSettings()">&times;</button>
                </div>
                <div class="consent-modal-body">
                    <p>Vyberte, ktore kategorie cookies chcete povolit. Nevyhnutne cookies su potrebne 
                    pre zakladnu funkcnost stranky a nie je mozne ich vypnut.</p>
                    
                    <div class="consent-category">
                        <div class="consent-category-header">
                            <label>
                                <input type="checkbox" checked disabled>
                                <strong>Nevyhnutne cookies</strong>
                            </label>
                            <span class="consent-always-on">Vzdy aktivne</span>
                        </div>
                        <p class="consent-category-desc">Zabezpecuju zakladnu funkcnost stranky, prihlasenie a ukladanie suhlasu.</p>
                    </div>
                    
                    <div class="consent-category">
                        <div class="consent-category-header">
                            <label>
                                <input type="checkbox" id="consent-preferences" ${choices.preferences ? 'checked' : ''}>
                                <strong>Preferencne cookies</strong>
                            </label>
                        </div>
                        <p class="consent-category-desc">Umoznuju zapamatat si vase nastavenia, ako je rozlozenie admin panelu, oblubene polozky a filtre.</p>
                    </div>
                    
                    <div class="consent-category">
                        <div class="consent-category-header">
                            <label>
                                <input type="checkbox" id="consent-analytics" ${choices.analytics ? 'checked' : ''}>
                                <strong>Analyticke cookies</strong>
                            </label>
                        </div>
                        <p class="consent-category-desc">Pomahaju nam pochopit, ako navstevnici pouzivaju stranku, aby sme ju mohli zlepsovat.</p>
                    </div>
                    
                    <div class="consent-category">
                        <div class="consent-category-header">
                            <label>
                                <input type="checkbox" id="consent-marketing" ${choices.marketing ? 'checked' : ''}>
                                <strong>Marketingove cookies</strong>
                            </label>
                        </div>
                        <p class="consent-category-desc">Pouzivaju sa na zobrazovanie relevantnych reklam a meranie ich ucinnosti.</p>
                    </div>
                </div>
                <div class="consent-modal-footer">
                    <button type="button" class="consent-btn consent-btn-secondary" onclick="window.JKZMConsent.rejectOptional()">Odmietnut volitelne</button>
                    <button type="button" class="consent-btn consent-btn-outline" onclick="window.JKZMConsent.saveFromModal()">Ulozit vyber</button>
                    <button type="button" class="consent-btn consent-btn-primary" onclick="window.JKZMConsent.acceptAll()">Prijat vsetko</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modalElement = modal;
    }

    function showModal() {
        createModal();
        modalElement.classList.add('visible');
    }

    function hideModal() {
        if (modalElement) {
            modalElement.classList.remove('visible');
            setTimeout(() => {
                if (modalElement) {
                    modalElement.remove();
                    modalElement = null;
                }
            }, 300);
        }
    }

    // === VEREJNE API ===
    window.JKZMConsent = {
        // Ziska aktualny stav suhlasu
        get: function() {
            return getStoredConsent();
        },

        // Nastavi suhlas programovo
        set: function(choices) {
            saveConsent(choices);
            hideBanner();
            hideModal();
            applyConsent();
        },

        // Otvori nastavenia
        openSettings: function() {
            showModal();
        },

        // Zavrie nastavenia
        closeSettings: function() {
            hideModal();
        },

        // Prijat vsetko
        acceptAll: function() {
            this.set({
                preferences: true,
                analytics: true,
                marketing: true
            });
        },

        // Odmietnut volitelne (iba necessary)
        rejectOptional: function() {
            this.set({
                preferences: false,
                analytics: false,
                marketing: false
            });
        },

        // Ulozit z modalu
        saveFromModal: function() {
            const prefs = document.getElementById('consent-preferences')?.checked || false;
            const analytics = document.getElementById('consent-analytics')?.checked || false;
            const marketing = document.getElementById('consent-marketing')?.checked || false;
            
            this.set({
                preferences: prefs,
                analytics: analytics,
                marketing: marketing
            });
        },

        // Skontroluje ci je dana kategoria povolena
        isAllowed: function(category) {
            if (category === 'necessary') return true;
            const stored = getStoredConsent();
            if (!stored) return false;
            return !!stored.choices[category];
        },

        // Vynuti zobrazenie banneru (pre testovanie)
        showBanner: function() {
            createBanner();
        },

        // Vymaze suhlas (pre testovanie)
        reset: function() {
            localStorage.removeItem(STORAGE_KEY);
            consentData = null;
            location.reload();
        }
    };

    // === STYLY ===
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Consent Banner */
            #jkzm-consent-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #1a1a2e;
                color: #fff;
                padding: 1rem;
                z-index: 99999;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
            }
            .consent-banner-inner {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 1rem;
            }
            .consent-banner-text {
                flex: 1;
                min-width: 300px;
            }
            .consent-banner-text p {
                margin: 0;
                font-size: 0.9rem;
                line-height: 1.5;
            }
            .consent-banner-text a {
                color: #4ade80;
                text-decoration: underline;
            }
            .consent-banner-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            /* Consent Buttons */
            .consent-btn {
                padding: 0.6rem 1.2rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 500;
                transition: all 0.2s;
            }
            .consent-btn-primary {
                background: #10b981;
                color: #fff;
            }
            .consent-btn-primary:hover {
                background: #059669;
            }
            .consent-btn-secondary {
                background: #374151;
                color: #fff;
            }
            .consent-btn-secondary:hover {
                background: #4b5563;
            }
            .consent-btn-outline {
                background: transparent;
                color: #10b981;
                border: 1px solid #10b981;
            }
            .consent-btn-outline:hover {
                background: #10b981;
                color: #fff;
            }
            .consent-btn-link {
                background: transparent;
                color: #9ca3af;
                text-decoration: underline;
            }
            .consent-btn-link:hover {
                color: #fff;
            }

            /* Consent Modal */
            #jkzm-consent-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s;
            }
            #jkzm-consent-modal.visible {
                opacity: 1;
                visibility: visible;
            }
            .consent-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.6);
            }
            .consent-modal-content {
                position: relative;
                background: #fff;
                border-radius: 8px;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .consent-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid #e5e7eb;
            }
            .consent-modal-header h3 {
                margin: 0;
                font-size: 1.2rem;
                color: #1f2937;
            }
            .consent-modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #6b7280;
                padding: 0;
                line-height: 1;
            }
            .consent-modal-close:hover {
                color: #1f2937;
            }
            .consent-modal-body {
                padding: 1.5rem;
            }
            .consent-modal-body > p {
                margin: 0 0 1.5rem 0;
                color: #4b5563;
                font-size: 0.9rem;
            }

            /* Consent Categories */
            .consent-category {
                padding: 1rem;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                margin-bottom: 1rem;
            }
            .consent-category:last-child {
                margin-bottom: 0;
            }
            .consent-category-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .consent-category-header label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
            }
            .consent-category-header input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            .consent-always-on {
                font-size: 0.75rem;
                color: #10b981;
                background: #d1fae5;
                padding: 0.2rem 0.5rem;
                border-radius: 4px;
            }
            .consent-category-desc {
                margin: 0.5rem 0 0 1.7rem;
                font-size: 0.85rem;
                color: #6b7280;
            }

            /* Modal Footer */
            .consent-modal-footer {
                display: flex;
                flex-wrap: wrap;
                justify-content: flex-end;
                gap: 0.5rem;
                padding: 1rem 1.5rem;
                border-top: 1px solid #e5e7eb;
                background: #f9fafb;
            }

            /* Responsive */
            @media (max-width: 600px) {
                .consent-banner-inner {
                    flex-direction: column;
                    text-align: center;
                }
                .consent-banner-buttons {
                    justify-content: center;
                    width: 100%;
                }
                .consent-modal-footer {
                    justify-content: center;
                }
                .consent-btn {
                    flex: 1;
                    min-width: 120px;
                }
            }

            /* Footer link style */
            .consent-footer-link {
                color: inherit;
                text-decoration: underline;
                cursor: pointer;
            }
            .consent-footer-link:hover {
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }

    // === INICIALIZACIA ===
    function init() {
        injectStyles();

        // Ak uz existuje suhlas, aplikuj ho
        if (!needsConsent()) {
            applyConsent();
            return;
        }

        // Inak zobraz banner
        createBanner();
    }

    // Spusti po nacitani DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
