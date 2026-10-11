import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import MobileHeader from './mobileHeader.jsx';
import ClimateNewsBar from './climateNewsBar.jsx';
import LanguageSwitch from './languageSwitch.jsx';
import { useTranslations } from '../shared/i18n/useTranslations.js';

// Ten sam prog co w CSS (index.css: .desktopHeader ukryty ponizej 1024px).
function useIsMobile(query = '(max-width: 1023px)') {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return undefined;
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function Header({ lang, handleLanguageChange }) {
  // Jeden pasek wiadomosci zamiast dwoch (desktop + mobile): jedno zapytanie do API
  // i bez podwojnego naglowka dla czytnikow ekranu.
  const isMobile = useIsMobile();
  const ticker = <ClimateNewsBar />;

  return (
    <>
      <DesktopHeader lang={lang} handleLanguageChange={handleLanguageChange} ticker={isMobile ? null : ticker} />
      <MobileHeader lang={lang} handleLanguageChange={handleLanguageChange} ticker={isMobile ? ticker : null} />
    </>
  );
}

function DesktopHeader({ lang, handleLanguageChange, ticker }) {
  const location = useLocation();
  const { t } = useTranslations();
  const menuItems = t.navbar?.menuItems ?? [];
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <header className={`desktopHeader${isScrolled ? ' is-scrolled' : ''}`} id="header">
      <div className="headerElementsContainer">
        <Link to={`/${lang}`} className="desktop logo" aria-label={t.header?.homeLink ?? 'Młodzieżowy Strajk Klimatyczny – strona główna'}>
          <img src="/logoMSK.webp" alt="" width="512" height="512" decoding="async" />
          <img src="/logoFFF.png" alt="" width="512" height="512" decoding="async" />
        </Link>

        <div className="desktopNavbar">
          <nav className="navbarItems" aria-label={t.a11y?.mainMenu ?? 'Główne menu'}>
            <ul>
              {menuItems.map(({ label, link }) => {
                const to = (link || '').replace(':lang', lang);
                const active = isActive(to);
                return (
                  <li key={to} className={active ? 'active' : ''}>
                    <Link to={to} aria-current={active ? 'page' : undefined}>
                      {label}
                    </Link>
                  </li>
                );
              })}
              <li className="flags-item">
                <LanguageSwitch lang={lang} onChange={handleLanguageChange} label={t.a11y?.languageSwitch} />
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {ticker}
    </header>
  );
}

export default Header;
