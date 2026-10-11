import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// 'ua' usunieto: nie ma pliku public/locales/ua.json, a kod jezyka ukrainskiego to 'uk'.
export const SUPPORTED_LANGS = new Set(['pl', 'en']);
export const DEFAULT_LANG = 'pl';

const CACHE = new Map();
const RESOLVED = new Map();

export function langFromPath(pathname) {
  const seg = (pathname.split('/')[1] ?? '').toLowerCase();
  return SUPPORTED_LANGS.has(seg) ? seg : DEFAULT_LANG;
}

export function loadLocale(lang) {
  if (!CACHE.has(lang)) {
    CACHE.set(
      lang,
      fetch(`/locales/${lang}.json`, { credentials: 'same-origin' })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          RESOLVED.set(lang, data);
          return data;
        })
        .catch((err) => {
          CACHE.delete(lang);
          throw err;
        })
    );
  }
  return CACHE.get(lang);
}

/** Tylko do testow. */
export function __resetLocaleCache() {
  CACHE.clear();
  RESOLVED.clear();
}

export function useTranslations() {
  const { pathname } = useLocation();
  const lang = langFromPath(pathname);

  const [state, setState] = useState(() => ({
    lang,
    t: RESOLVED.get(lang) ?? {},
    ready: RESOLVED.has(lang),
  }));

  useEffect(() => {
    let active = true;
    if (RESOLVED.has(lang)) {
      setState({ lang, t: RESOLVED.get(lang), ready: true });
      return undefined;
    }
    setState((s) => ({ ...s, ready: false }));

    loadLocale(lang)
      .then((data) => {
        if (active) setState({ lang, t: data, ready: true });
      })
      .catch((err) => {
        console.error('Nie udalo sie wczytac tlumaczen:', err);
        if (active) setState({ lang, t: {}, ready: true });
      });

    return () => {
      active = false;
    };
  }, [lang]);

  const t = state.lang === lang ? state.t : RESOLVED.get(lang) ?? {};
  return { t, lang, ready: state.lang === lang && state.ready };
}

/** Wstawia wartosci w miejsce {klucz}: format('Zebrano {x}', { x: 5 }). */
export function format(template, vars = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}
