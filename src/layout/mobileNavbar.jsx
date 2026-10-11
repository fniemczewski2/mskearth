import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

import LanguageSwitch from './languageSwitch.jsx';
import { useTranslations } from '../shared/i18n/useTranslations.js';

export default function MobileNavbar({ id = 'mobile-nav', lang = 'pl', handleLanguageChange, isOpen, onNavigate }) {
  const { t } = useTranslations();
  const { pathname } = useLocation();
  const menuItems = useMemo(() => t.mobileNavbar?.menuItems ?? [], [t.mobileNavbar?.menuItems]);
  const navRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const nav = navRef.current;
    if (!nav) return undefined;

    const focusables = nav.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab' || focusables.length === 0) return;
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

  return (
    <nav
      id={id}
      ref={navRef}
      className={`mobileNavbar ${isOpen ? 'is-open' : ''}`}
      style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      aria-label={t.a11y?.mobileMenu ?? 'Nawigacja mobilna'}
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
    >
      <ul className="navbarItems">
        {menuItems.map((item) => {
          const to = `/${lang}${item.link === '/' ? '' : item.link}`;
          const active = item.link === '/' ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <li key={item.link}>
              <Link to={to} onClick={onNavigate} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}

        <li>
          <LanguageSwitch
            lang={lang}
            label={t.a11y?.languageSwitch}
            onChange={(code) => {
              handleLanguageChange(code);
              onNavigate?.();
            }}
          />
        </li>
      </ul>
    </nav>
  );
}

MobileNavbar.propTypes = {
  id: PropTypes.string,
  lang: PropTypes.string.isRequired,
  handleLanguageChange: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onNavigate: PropTypes.func,
};
