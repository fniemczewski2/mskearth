import { useEffect, useState } from 'react';

import { PRIVACY_POLICY_PATH } from '../shared/config/site.js';
import { useTranslations } from '../shared/i18n/useTranslations.js';
import { analyticsConfigured } from '../shared/lib/analytics.js';
import { getConsent, onConsentChange, setConsent } from '../shared/lib/consent.js';

/**
 * Baner zgody na analityke (Google Analytics 4). Bez zgody nie laduje sie zaden skrypt
 * analityczny i nie powstaja ciasteczka. Gdy analityka nie jest skonfigurowana,
 * baner jest sama informacja o plikach niezbednych.
 */
export default function CookieConsent() {
  const { t } = useTranslations();
  const c = t.cookies ?? {};
  const withAnalytics = analyticsConfigured();

  const [open, setOpen] = useState(() => getConsent() === null);

  // detail = null oznacza prosbe o ponowne otwarcie (link w stopce).
  useEffect(() => onConsentChange((consent) => setOpen(consent === null)), []);

  if (!open) return null;

  return (
    <section
      className="cookie-dialog cookie-notice overlay-content"
      role="region"
      aria-labelledby="cookie-title"
    >
      <h2 id="cookie-title">{c.title ?? 'Pliki cookies'}</h2>

      <div className="cookies">
        <p>
          {withAnalytics
            ? (c.messageAnalytics ??
              'Używamy plików niezbędnych do działania strony. Za Twoją zgodą włączymy też Google Analytics, żeby wiedzieć, które treści są czytane.')
            : (c.message ??
              'Ta strona używa tylko plików niezbędnych do działania. Nie śledzimy Cię i nie używamy analityki ani reklam.')}{' '}
          <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer">
            {c.policy ?? 'Polityka prywatności'}
            <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
          </a>
        </p>

        <div className="cookie-actions">
          {withAnalytics ? (
            <>
              <button
                type="button"
                className="cookiesButton cookiesButton--secondary"
                onClick={() => setConsent(false)}
              >
                {c.reject ?? 'Tylko niezbędne'}
              </button>
              <button type="button" className="cookiesButton primaryBtn" onClick={() => setConsent(true)}>
                {c.accept ?? 'Zgadzam się na analitykę'}
              </button>
            </>
          ) : (
            <button type="button" className="cookiesButton primaryBtn" onClick={() => setConsent(false)}>
              {c.button ?? 'Rozumiem'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
