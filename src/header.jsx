import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MobileHeader from './mobile/mobileHeader';
import ReactCountryFlag from 'react-country-flag';

import './style/header.css';
import logoMSK from './assets/logoMSK.png';
import logoFFF from './assets/logoFFF.png';
import ClimateNewsBar from './pages/climateNewsBar';

/** Pobiera pełny plik i18n (np. /locales/pl.json) */
async function fetchLocale(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error loading translations:', err);
    return null;
  }
}

function Header({ lang, handleLanguageChange }) {
  // Ustal język z propsa lub z URL (1. segment), fallback "pl"
  const location = useLocation();
  const effectiveLang = useMemo(() => {
    const seg = (location.pathname.split('/')[1] || '').toLowerCase();
    const supported = ['pl', 'en', 'ua'];
    if (lang && supported.includes(lang)) return lang;
    return supported.includes(seg) ? seg : 'pl';
  }, [lang, location.pathname]);

  // Możemy chcieć przekazać mobileMenu do MobileHeader (nie jest wymagane jeśli MobileHeader sam pobiera)
  const [mobileMenuItems, setMobileMenuItems] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchLocale(effectiveLang);
      if (!active || !data) return;
      setMobileMenuItems(data?.mobileNavbar?.menuItems ?? []);
    })();
    return () => { active = false; };
  }, [effectiveLang]);

  return (
    <>
      <DesktopHeader lang={effectiveLang} handleLanguageChange={handleLanguageChange} />
      {/* Jeśli MobileHeader ma własne tłumaczenia, możesz pominąć props mobileMenuItems */}
      <MobileHeader
        lang={effectiveLang}
        handleLanguageChange={handleLanguageChange}
        menuItems={mobileMenuItems}
      />
    </>
  );
}

function DesktopHeader({ lang, handleLanguageChange }) {
  const location = useLocation();
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchLocale(lang);
      if (!active || !data) return;
      // ⬇️ dokładnie z pliku: navbar.menuItems
      setMenuItems(data?.navbar?.menuItems ?? []);
    })();
    return () => { active = false; };
  }, [lang]);

  const isActive = (href) => {
    // aktywne gdy dokładnie pasuje lub gdy path zaczyna się od href (np. /pl/aktualnosci/123)
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <header className="desktopHeader" id="header">
      <div className="headerElementsContainer">
        <Link to={`/${lang}`} className="desktop logo">
          <img src={logoMSK} alt="Logo Młodzieżowy Strajk Klimatyczny" />
          <img src={logoFFF} alt="Logo Fridays For Future" />
        </Link>

        <div className="desktopNavbar">
          <nav className="navbarItems" aria-label="Główne menu">
            <ul>
              {menuItems.map(({ label, link }, idx) => {
                const to = (link || '').replace(':lang', lang);
                return (
                  <li key={`${label}-${idx}`} className={isActive(to) ? 'active' : ''}>
                    <Link to={to}>{label}</Link>
                  </li>
                );
              })}

              <span className="flags" aria-label="Wybór języka">
                {lang !== 'pl' && (
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('pl')}
                    title="Polski"
                    aria-label="Polski"
                    className="flag-btn"
                  >
                    <ReactCountryFlag countryCode="PL" svg />
                  </button>
                )}
                {lang !== 'en' && (
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    title="English"
                    aria-label="English"
                    className="flag-btn"
                  >
                    <ReactCountryFlag countryCode="GB" svg />
                  </button>
                )}
                {lang !== 'ua' && (
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ua')}
                    title="Українська"
                    aria-label="Українська"
                    className="flag-btn"
                  >
                    <ReactCountryFlag countryCode="UA" svg />
                  </button>
                )}
              </span>
            </ul>
          </nav>
        </div>
      </div>

      <ClimateNewsBar />
    </header>
  );
}

export default Header;
