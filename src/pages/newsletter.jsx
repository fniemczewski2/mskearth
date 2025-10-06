import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../style/newsletter.css';

const LOCALE_CACHE = new Map();
const FORM_ID = '7027392'; // your ConvertKit form id
const SUBSCRIBE_URL = `https://api.convertkit.com/v3/forms/${FORM_ID}/subscribe`;
const REQUEST_TIMEOUT_MS = 15000;

export default function NewsletterForm() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [t, setT] = useState({ newsletter: {} });
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [errMsg, setErrMsg] = useState('');

  const abortRef = useRef(null);

  // i18n (cache per language)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (LOCALE_CACHE.has(language)) {
          if (active) setT(LOCALE_CACHE.get(language));
        } else {
          const res = await fetch(`/locales/${language}.json`, { credentials: 'same-origin' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          LOCALE_CACHE.set(language, data);
          if (active) setT(data);
        }
      } catch (e) {
        console.error('i18n error:', e);
        if (active) setT({ newsletter: {} });
      }
    })();
    return () => { active = false; };
  }, [language]);

  const validate = () => {
    if (!consent) return { ok: false, msg: t.newsletter?.consentRequired || 'Zaznacz zgodę.' };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, msg: t.newsletter?.invalidEmail || 'Nieprawidłowy e-mail.' };
    return { ok: true, msg: '' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading'); setErrMsg('');

    const v = validate();
    if (!v.ok) { setStatus('error'); setErrMsg(v.msg); return; }

    // cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          api_key: import.meta.env.VITE_CONVERTKIT_PUBLIC_API_KEY,
          email,
        }),
        signal: controller.signal,
      });

      // manual timeout (since native fetch timeout isn't universal)
      const timeout = new Promise((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), REQUEST_TIMEOUT_MS)
      );
      await Promise.race([resp, timeout]);

      if (!resp.ok) {
        let info = '';
        try {
          const j = await resp.json();
          info = j?.message || '';
        } catch { /* ignore */ }
        throw new Error(info || `HTTP ${resp.status}`);
      }

      setStatus('ok');
      setEmail('');
      setConsent(false);
    } catch (err) {
      if (err.name === 'AbortError') return; // user resubmitted
      setStatus('error');
      setErrMsg(
        err.message === 'timeout'
          ? (t.newsletter?.timeout || 'Przekroczono czas. Spróbuj ponownie.')
          : (t.newsletter?.failed || 'Nie udało się zapisać do newslettera.')
      );
      console.error('Newsletter subscribe error:', err);
    }
  };

  return (
    <>
      <h2>{t.newsletter?.h2 || 'Newsletter'}</h2>

      <aside className="newsletter">
        <form className="newsletter-form" onSubmit={handleSubmit} noValidate aria-busy={status === 'loading' ? 'true' : 'false'}>
          {/* Honeypot: bots fill visible inputs eagerly; this one is hidden off-screen */}
          <input
            type="text"
            name="company" // innocuous name
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            onChange={() => { /* if filled, silently ignore submit by failing validation */ }}
          />

          <label className="formLabel" htmlFor="newsletter-email">
            {t.newsletter?.emailLabel || 'E-mail'}
          </label>
          <input
            className="formField"
            id="newsletter-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            autoComplete="email"
            inputMode="email"
          />

          <div className="agreementContainer">
            <input
              id="newsletter-consent"
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              aria-required="true"
            />
            <label className="agreement" htmlFor="newsletter-consent">
              {t.newsletter?.consent || 'Wyrażam zgodę na przetwarzanie danych zgodnie z polityką prywatności.'}
            </label>
          </div>

          <button type="submit" className="newsletterButton" disabled={status === 'loading'}>
            {status === 'loading' ? (t.newsletter?.pending || 'Przetwarzanie…') : (t.newsletter?.submit || 'Zapisz się')}
            &nbsp;<i className="bi bi-envelope icon newsletterIcon" aria-hidden="true" />
          </button>

          {/* Status messages */}
          {status === 'loading' && (
            <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
              <span className="spinner" aria-hidden="true"/>
            </div>
          )}
          {status === 'error' && (
            <p className="failed" role="alert">{errMsg || t.newsletter?.failed || 'Coś poszło nie tak.'}</p>
          )}
          {status === 'ok' && (
            <p className="succeeded" role="status" aria-live="polite">
              {t.newsletter?.success || 'Dziękujemy! Sprawdź skrzynkę e-mail.'}
            </p>
          )}
        </form>
      </aside>
    </>
  );
}
