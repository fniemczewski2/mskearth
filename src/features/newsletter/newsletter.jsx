import { useRef, useState } from 'react';

import { useTranslations } from '../../shared/i18n/useTranslations.js';

const SUBSCRIBE_URL = '/api/newsletter-subscribe';
const REQUEST_TIMEOUT_MS = 15000;

export default function NewsletterForm() {
  const { t } = useTranslations();

  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errMsg, setErrMsg] = useState('');
  const [company, setCompany] = useState('');

  const abortRef = useRef(null);

  const validate = () => {
    if (company.trim().length > 0) {
      return { ok: false, msg: t.newsletter?.failed || 'Coś poszło nie tak.' };
    }
    if (!consent) return { ok: false, msg: t.newsletter?.consentRequired || 'Zaznacz zgodę.' };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, msg: t.newsletter?.invalidEmail || 'Nieprawidłowy e-mail.' };
    return { ok: true, msg: '' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return; 

    setStatus('loading'); 
    setErrMsg('');

    const v = validate();
    if (!v.ok) { 
      setStatus('error'); 
      setErrMsg(v.msg); 
      return; 
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const resp = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, consent, company }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        let info = '';
        try {
          const j = await resp.json();
          info =
            j?.message ||
            j?.error?.message ||
            (Array.isArray(j?.errors) ? j.errors.map((x) => x?.message).filter(Boolean).join(', ') : '');
        } catch {
          info = '';
        }
        throw new Error(info || `HTTP ${resp.status}`);
      }

      setStatus('ok');
      setEmail('');
      setConsent(false);
      setCompany('');
    } catch (err) {
      if (err && err.name === 'AbortError') {
        setStatus('error');
        setErrMsg(t.newsletter?.timeout || 'Przekroczono czas. Spróbuj ponownie.');
      } else {
        const isTimeout = String(err?.message || '').toLowerCase().includes('timeout');
        setStatus('error');
        setErrMsg(
          isTimeout
            ? (t.newsletter?.timeout || 'Przekroczono czas. Spróbuj ponownie.')
            : /already/i.test(err?.message || '')
            ? (t.newsletter?.success || 'Dziękujemy! Sprawdź skrzynkę e-mail.')
            : (t.newsletter?.failed || 'Nie udało się zapisać do newslettera.')
        );
        console.error('Newsletter subscribe error:', err);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const busy = status === 'loading';

  return (
    <>
      <h2>{t.newsletter?.h2 || 'Newsletter'}</h2>

      <aside className="newsletter">
        <form
          className="newsletter-form"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={busy ? 'true' : 'false'}
        >
          <label htmlFor="company" style={{ position: 'absolute', left: '-9999px' }}>
            Company
          </label>
          <input
            id="company"
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
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

          <button
            type="submit"
            className="newsletterButton"
            disabled={busy}
            aria-disabled={busy ? 'true' : 'false'}
          >
            {busy ? (t.newsletter?.pending || 'Przetwarzanie…') : (t.newsletter?.submit || 'Zapisz się')}
            &nbsp;<i className="bi bi-envelope icon newsletterIcon" aria-hidden="true" />
          </button>
          
          {busy && (
            <div className="loader" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              <span className="sr-only">Ładowanie…</span>
            </div>
          )}
          {status === 'error' && (
            <p className="failed" role="alert">
              {errMsg || t.newsletter?.failed || 'Coś poszło nie tak.'}
            </p>
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
