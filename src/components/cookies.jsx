import React, { useState, useEffect } from 'react';

function CookieConsent() {
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [showCookieConsent, setShowCookieConsent] = useState(false);
    const [translations, setTranslations] = useState({ cookies: {} });
    const [language, setLanguage] = useState('pl'); 

    const fetchTranslations = async (lang) => {
        try {
        const response = await fetch(`/locales/${lang}.json`);
        const data = await response.json();
        setTranslations(data);
        } catch (error) {
        console.error('Error loading translations:', error);
        }
    };

    useEffect(() => {
        const lang = window.location.pathname.split('/')[1] || 'pl';
        setLanguage(lang);
        fetchTranslations(lang);
    }, [language]);

    useEffect(() => {
        const isCookieConsentShown = sessionStorage.getItem('cookieConsentShown');
        if (!isCookieConsentShown) {
            setShowCookieConsent(true);
            setOverlayVisible(true);
        }
    }, []);

    const handleCookieConsentClose = () => {
        setShowCookieConsent(false);
        setOverlayVisible(false);
        sessionStorage.setItem('cookieConsentShown', 'true');
    };

    return (
        <>
            {showCookieConsent && overlayVisible && (
                <div className="overlay" onClick={handleCookieConsentClose}>
                    <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
                        <div>
                            <h2>COOKIES</h2>
                            <article className="cookies">
                                <p>{translations.cookies.message}</p>
                                <button className="cookiesButton" onClick={handleCookieConsentClose}>{translations.cookies.button}</button>
                            </article>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default CookieConsent;
