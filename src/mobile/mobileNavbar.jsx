import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import ReactCountryFlag from 'react-country-flag';

const LOCALE_CACHE = new Map();

async function loadMenuItems(lang) {
  try {
    if (LOCALE_CACHE.has(lang)) return LOCALE_CACHE.get(lang);
    const res = await fetch(`/locales/${lang}.json`, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data?.mobileNavbar?.menuItems || [];
    LOCALE_CACHE.set(lang, items);
    return items;
  } catch (e) {
    console.error('Error loading translations:', e);
    return [];
  }
}

const MobileNavbar = forwardRef(function MobileNavbar(
  { id = 'mobile-nav', lang = 'pl', handleLanguageChange, isOpen, toggleOpen },
  ref
) {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [menuItems, setMenuItems] = useState([]);

  const navRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  useEffect(() => {
    if (!ref) return;
    if (typeof ref === 'function') ref(navRef.current);
    else ref.current = navRef.current;
  }, [ref]);

  useEffect(() => {
    let active = true;
    (async () => {
      const items = await loadMenuItems(language);
      if (active) setMenuItems(items);
    })();
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    if (!isOpen) return;
    const nav = navRef.current;
    if (!nav) return;

    const focusables = nav.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    firstFocusableRef.current = first || null;
    lastFocusableRef.current = last || null;
    first?.focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (focusables.length === 0) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    nav.addEventListener('keydown', onKeyDown);
    return () => nav.removeEventListener('keydown', onKeyDown);
  }, [isOpen, menuItems]);

  const style = {
    transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
  };

  const linkFor = (base) => `/${language}${base}`;

  return (
    <nav
      id={id}
      ref={navRef}
      className="mobileNavbar"
      style={style}
      aria-label="Nawigacja mobilna"
      hidden={!isOpen} 
    >
      <ul className="navbarItems" onClick={toggleOpen}>
        {menuItems.map((item, index) => (
          <li key={`${item.link}-${index}`}>
            <Link to={linkFor(item.link)}>
              {item.label}
            </Link>
          </li>
        ))}

        <li>
          <span className="flags" role="group" aria-label="Wybór języka">
            {lang !== 'pl' && (
              <button
                type="button"
                onClick={() => handleLanguageChange('pl')}
                className="flag-btn"
                aria-label="Polski"
                title="Polski"
              >
                <ReactCountryFlag countryCode="PL" svg aria-hidden="true" />
              </button>
            )}
            {lang !== 'en' && (
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className="flag-btn"
                aria-label="English"
                title="English"
              >
                <ReactCountryFlag countryCode="GB" svg aria-hidden="true" />
              </button>
            )}
            {/* {lang !== 'ua' && (
              <button
                type="button"
                onClick={() => handleLanguageChange('ua')}
                className="flag-btn"
                aria-label="Українська"
                title="Українська"
              >
                <ReactCountryFlag countryCode="UA" svg aria-hidden="true" />
              </button>
            )} */}
          </span>
        </li>
      </ul>
    </nav>
  );
});

MobileNavbar.propTypes = {
  id: PropTypes.string,
  lang: PropTypes.string.isRequired,
  handleLanguageChange: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  toggleOpen: PropTypes.func.isRequired,
};

export default MobileNavbar;
