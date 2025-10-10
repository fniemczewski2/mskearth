import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import MobileNavbar from "./mobileNavbar";

function MobileHeader({ lang = 'pl', handleLanguageChange }) {
  const [isOpen, setOpen] = useState(false);
  const location = useLocation();

  const homeHref = useMemo(() => {
    const l = (lang || '').trim();
    return l && l !== 'pl' ? `/${l}` : '/';
  }, [lang]);

  const toggleOpen = () => setOpen(v => !v);
  const closeMenu = () => setOpen(false);

  useEffect(() => { closeMenu(); }, [location.pathname]);

  useEffect(() => {
    const { body } = document;
    if (!body) return;
    const prev = body.style.overflow;
    if (isOpen) body.style.overflow = 'hidden';
    return () => { body.style.overflow = prev; };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <>
      <header
        className={`mobileHeader ${isOpen ? 'is-open' : ''}`}
        // prefer doing shadows in CSS; class toggled above if you need variations
      >
        <Link to={homeHref} className="mobile logo" aria-label="Strona główna">
          <img
            src="/logoMSK.png"
            alt="MSK — Młodzieżowy Strajk Klimatyczny"
            loading="lazy"
            decoding="async"
          />
          <img
            src="/logoFFF.png"
            alt="FFF — Fridays For Future"
            loading="lazy"
            decoding="async"
          />
        </Link>
        <button
          type="button"
          className={`burger ${isOpen ? 'is-open' : ''}`}
          aria-label={isOpen ? 'Zamknij menu' : 'Otwórz menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          onClick={toggleOpen}
        >
          <span className={isOpen ? 'open' : 'close'} aria-hidden="true" />
          <span className={isOpen ? 'open' : 'close'} aria-hidden="true" />
          <span className={isOpen ? 'open' : 'close'} aria-hidden="true" />
        </button>
      </header>

      {/* Make sure MobileNavbar sets id="mobile-nav" on its root element */}
      <MobileNavbar
        id="mobile-nav"
        isOpen={isOpen}
        toggleOpen={toggleOpen}
        lang={lang}
        handleLanguageChange={handleLanguageChange}
      />
    </>
  );
}

export default MobileHeader;
