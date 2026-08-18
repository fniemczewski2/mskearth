import { useEffect, useRef, useState } from 'react';

import { useTranslations } from '../i18n/useTranslations.js';

const STORAGE_KEY = 'msk-cookie-consent';

export default function CookieConsent() {
  const { t } = useTranslations();
  const dialogRef = useRef(null);

  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === null;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [open]);

  const decide = (analytics) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ analytics, ts: new Date().toISOString(), version: 1 })
      );
    } catch (err) {
      void err;
    }
    dialogRef.current?.close();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="cookie-dialog overlay-content"
      aria-labelledby="cookie-title"
      onCancel={(e) => {
        e.preventDefault();
        decide(false);
      }}
    >
      <h2 id="cookie-title">{t.cookies?.title ?? 'Pliki cookies'}</h2>

      <article className="cookies">
        <p>
          {t.cookies?.message ??
            'Używamy plików cookies niezbędnych do działania serwisu. Możesz zgodzić się także na cookies analityczne.'}
        </p>

        <div className="cookie-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="cookiesButton primaryBtn" onClick={() => decide(true)}>
            {t.cookies?.accept ?? t.cookies?.button ?? 'Akceptuję wszystkie'}
          </button>
          <button type="button" className="cookiesButton" onClick={() => decide(false)}>
            {t.cookies?.reject ?? 'Tylko niezbędne'}
          </button>
        </div>

        <p>
          <a href="/polityka-prywatnosci.pdf" target="_blank" rel="noopener noreferrer">
            {t.cookies?.policy ?? 'Polityka prywatności'}
          </a>
        </p>
      </article>
    </dialog>
  );
}
