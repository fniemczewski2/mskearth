import { useState } from 'react';

import { useTranslations } from '../shared/i18n/useTranslations.js';

const STORAGE_KEY = 'msk-cookie-consent';

/**
 * Serwis nie uzywa analityki ani reklam, wiec nie ma o co prosic o zgode.
 * Zamiast modalu blokujacego strone pokazujemy nienachalna informacje.
 */
export default function CookieConsent() {
  const { t } = useTranslations();

  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === null;
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ analytics: false, ts: new Date().toISOString(), version: 2 })
      );
    } catch (err) {
      void err;
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <section className="cookie-dialog cookie-notice overlay-content" role="region" aria-labelledby="cookie-title">
      <h2 id="cookie-title">{t.cookies?.title ?? 'Pliki cookies'}</h2>

      <div className="cookies">
        <p>
          {t.cookies?.message ??
            'Ta strona używa tylko plików niezbędnych do działania. Nie śledzimy Cię i nie używamy analityki ani reklam.'}{' '}
          <a href="/polityka-prywatnosci.pdf" target="_blank" rel="noopener noreferrer">
            {t.cookies?.policy ?? 'Polityka prywatności'}
            <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
          </a>
        </p>

        <div className="cookie-actions">
          <button type="button" className="cookiesButton primaryBtn" onClick={dismiss}>
            {t.cookies?.button ?? 'Rozumiem'}
          </button>
        </div>
      </div>
    </section>
  );
}
