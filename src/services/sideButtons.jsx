import React, { useState, useEffect } from 'react';
import '../style/sideButtons.css';
import JoinUs from '../pages/joinUs';
import Donate from '../pages/donate';
import NewsletterForm from '../pages/newsletter';

function SideButtons() {
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [translations, setTranslations] = useState({ buttons: {} });
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
    }, []); 

    const handleButtonClick = (section) => {
        setActiveSection(section);
        setOverlayVisible(true);
    };

    const handleCloseOverlay = () => {
        setOverlayVisible(false);
        setActiveSection(null);
    };

    return (
        <>
            <aside className="side-button" onClick={() => handleButtonClick('joinUs')}>
                <i className="bi bi-rocket-takeoff icon"></i>
                <span className="description">{translations.buttons.joinUs || 'Join Us'}</span>
            </aside>
            <aside className="side-button" onClick={() => handleButtonClick('donate')}>
                <i className="bi bi-piggy-bank icon"></i>
                <span className="description">{translations.buttons.donate || 'Donate'}</span>
            </aside>
            {/* <aside className="side-button" onClick={() => handleButtonClick('newsletter')}>
                <i className="bi bi-envelope icon"></i>
                <span className="description">{translations.buttons.newsletter || 'Newsletter'}</span>
            </aside> */}
            {overlayVisible && (
                <div className="overlay" onClick={handleCloseOverlay}>
                    <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-button" onClick={handleCloseOverlay}>
                            <i className="bi bi-x"></i>
                        </button>
                        {activeSection === 'joinUs' && <div id="joinUs"><JoinUs /></div>}
                        {activeSection === 'donate' && <div id="donate"><Donate /></div>}
                        {/* {activeSection === 'newsletter' && <div id="newsletter"><NewsletterForm /></div>} */}
                    </div>
                </div>
            )}
        </>
    );
}

export default SideButtons;
