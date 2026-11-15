import { useId, useRef, useState } from 'react';

import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { EMAIL_RE, PRIVACY_POLICY_PATH, REQUEST_TIMEOUT_MS } from '../../shared/config/site.js';
import { getCaptchaToken } from '../../shared/lib/captcha.js';
import Honeypot from '../../shared/components/Honeypot.jsx';
import Loader from '../../shared/components/Loader.jsx';

const SUBSCRIBE_URL = '/api/newsletter-subscribe';

export default function NewsletterForm() {
  const { t, lang } = useTranslations();
  const uid = useId();
  const emailRef = useRef(null);
  const consentRef = useRef(null);
  const [errField, setErrField] = useState('');

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
    if (!EMAIL_RE.test(email.trim()))
      return { ok: false, field: 'email', msg: t.newsletter?.invalidEmail || 'Podaj poprawny adres e-mail.' };
    if (!consent)
      return {
        ok: false,
        field: 'consent',
        msg: t.newsletter?.consentRequired || 'Zaznacz zgodę na otrzymywanie newslettera.',
      };
    return { ok: true, msg: '' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;

    setStatus('loading');
    setErrMsg('');
    setErrField('');

    const v = validate();
    if (!v.ok) {
      setStatus('error');
      setErrMsg(v.msg);
      setErrField(v.field);
      if (v.field === 'email') emailRef.current?.focus();
      if (v.field === 'consent') consentRef.current?.focus();
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const captcha = await getCaptchaToken({ signal: controller.signal });
      const resp = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), consent, company, captcha, locale: lang }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        let info = '';
        try {
          const j = await resp.json();
          info =
            j?.message ||
            j?.error?.message ||
            (Array.isArray(j?.errors)
              ? j.errors
                  .map((x) => x?.message)
                  .filter(Boolean)
                  .join(', ')
              : '');
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
        const isTimeout = String(err?.message || '')
          .toLowerCase()
          .includes('timeout');
        setStatus('error');
        setErrMsg(
          isTimeout
            ? t.newsletter?.timeout || 'Przekroczono czas. Spróbuj ponownie.'
            : t.newsletter?.failed || 'Nie udało się zapisać do newslettera.'
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

      <div className="panel newsletter">
        <form
          className="newsletter-form"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={busy ? 'true' : 'false'}
        >
          <Honeypot id={`${uid}-company`} value={company} onChange={setCompany} />

          <label className="formLabel" htmlFor={`${uid}-email`}>
            {t.newsletter?.emailLabel || 'E-mail'}
          </label>
          <input
            className="formField"
            id={`${uid}-email`}
            ref={emailRef}
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            aria-invalid={errField === 'email' ? 'true' : undefined}
            aria-describedby={errField === 'email' ? `${uid}-error` : undefined}
          />

          <div className="agreementContainer">
            <input
              id={`${uid}-consent`}
              ref={consentRef}
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              aria-invalid={errField === 'consent' ? 'true' : undefined}
              aria-describedby={errField === 'consent' ? `${uid}-error` : undefined}
            />
            <label className="agreement" htmlFor={`${uid}-consent`}>
              {t.newsletter?.consent || 'Chcę otrzymywać newsletter fundacji na podany adres e-mail.'}
            </label>
          </div>

          <p className="agreement privacy-notice">
            {t.newsletter?.privacyNotice ||
              'Administratorem danych jest Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego. Wysyłkę obsługuje GetResponse.'}{' '}
            <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer">
              {t.cookies?.policy ?? 'Polityka prywatności'}
              <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
            </a>
          </p>

          <button type="submit" className="newsletterButton" aria-disabled={busy ? 'true' : 'false'}>
            {busy ? t.newsletter?.pending || 'Przetwarzanie…' : t.newsletter?.submit || 'Zapisz się'}
            &nbsp;
            <i className="bi bi-envelope icon newsletterIcon" aria-hidden="true" />
          </button>

          {busy && <Loader />}
          {status === 'error' && (
            <p className="failed" role="alert" id={`${uid}-error`}>
              {errMsg || t.newsletter?.failed || 'Coś poszło nie tak.'}
            </p>
          )}
          {status === 'ok' && (
            <p className="succeeded" role="status">
              {t.newsletter?.success || 'Dziękujemy! Sprawdź skrzynkę e-mail.'}
            </p>
          )}
        </form>
      </div>
    </>
  );
}
