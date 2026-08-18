import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Wspolny hook i18n. Zastepuje szesc kopii tego samego kodu
 * (donate, newsletter, thankyou, articlePage, contact, cookies),
 * kazda z wlasnym cache i wlasna obsluga bledow.
 */

export const SUPPORTED_LANGS = new Set(['pl', 'en', 'ua']);
export const DEFAULT_LANG = 'pl';

const CACHE = new Map();

export function langFromPath(pathname) {
  const seg = (pathname.split('/')[1] ?? '').toLowerCase();
  return SUPPORTED_LANGS.has(seg) ? seg : DEFAULT_LANG;
}

/** Deduplikuje rownolegle zadania o ten sam plik - w cache siedzi Promise. */
export function loadLocale(lang) {
  if (!CACHE.has(lang)) {
    CACHE.set(
      lang,
      fetch(`/locales/${lang}.json`, { credentials: 'same-origin' })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .catch((err) => {
          CACHE.delete(lang); // nie utrwalamy nieudanej proby
          throw err;
        })
    );
  }
  return CACHE.get(lang);
}

export function useTranslations() {
  const { pathname } = useLocation();
  const lang = langFromPath(pathname);

  const [t, setT] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);

    loadLocale(lang)
      .then((data) => {
        if (active) {
          setT(data);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setT({});
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [lang]);

  return { t, lang, ready };
}
