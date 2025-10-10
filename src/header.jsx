import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MobileHeader from './mobile/mobileHeader';
import ReactCountryFlag from 'react-country-flag';
import ClimateNewsBar from './components/climateNewsBar';

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
      setMenuItems(data?.navbar?.menuItems ?? []);
    })();
    return () => { active = false; };
  }, [lang]);

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <header className="desktopHeader" id="header">
      <div className="headerElementsContainer">
        <Link to={`/${lang}`} className="desktop logo">
          <img src="/logoMSK.png" alt="Logo Młodzieżowy Strajk Klimatyczny" />
          <img src="/logoFFF.png" alt="Logo Fridays For Future" />
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
                {/* {lang !== 'ua' && (
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ua')}
                    title="Українська"
                    aria-label="Українська"
                    className="flag-btn"
                  >
                    <ReactCountryFlag countryCode="UA" svg />
                  </button>
                )} */}
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
