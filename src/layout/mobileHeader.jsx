import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import MobileNavbar from './mobileNavbar.jsx';
import { useTranslations } from '../shared/i18n/useTranslations.js';

function MobileHeader({ lang = 'pl', handleLanguageChange, ticker }) {
  const { t } = useTranslations();
  const [isOpen, setOpen] = useState(false);
  const location = useLocation();
  const burgerRef = useRef(null);

  const toggleOpen = () => setOpen((v) => !v);
  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen((wasOpen) => {
      if (wasOpen && restoreFocus) requestAnimationFrame(() => burgerRef.current?.focus());
      return false;
    });
  }, []);

  useEffect(() => {
    closeMenu(false);
  }, [location.pathname, closeMenu]);

  useEffect(() => {
    const { body } = document;
    if (!body) return undefined;
    const prev = body.style.overflow;
    if (isOpen) body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeMenu]);

  return (
    <>
      {isOpen && <div className="mobile-nav-backdrop" onClick={() => closeMenu(true)} aria-hidden="true" />}
      <header className={`mobileHeader ${isOpen ? 'is-open' : ''}`}>
        <Link to={`/${lang}`} className="mobile logo" aria-label={t.a11y?.home ?? 'Strona główna'}>
          <img src="/logoMSK.webp" alt="" width="512" height="512" decoding="async" />
          <img src="/logoFFF.png" alt="" loading="lazy" decoding="async" />
        </Link>
        <button
          ref={burgerRef}
          type="button"
          className={`burger ${isOpen ? 'is-open' : ''}`}
          aria-label={isOpen ? (t.a11y?.closeMenu ?? 'Zamknij menu') : (t.a11y?.openMenu ?? 'Otwórz menu')}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          onClick={toggleOpen}
        >
          <span className={isOpen ? 'open' : 'close'} aria-hidden="true" />
          <span className={isOpen ? 'open' : 'close'} aria-hidden="true" />
          <span className={isOpen ? 'open' : 'close'} aria-hidden="true" />
        </button>

        {ticker}
      </header>

      <MobileNavbar
        id="mobile-nav"
        isOpen={isOpen}
        onNavigate={() => closeMenu(false)}
        lang={lang}
        handleLanguageChange={handleLanguageChange}
      />
    </>
  );
}

export default MobileHeader;
