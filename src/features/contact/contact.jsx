import { useId, useRef, useState } from 'react';

import Seo from '../../shared/components/Seo.jsx';
import Loader from '../../shared/components/Loader.jsx';
import Honeypot from '../../shared/components/Honeypot.jsx';
import useQuery from '../../shared/hooks/useQuery.js';
import { getCaptchaToken } from '../../shared/lib/captcha.js';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import {
  CONTACT_LIMITS,
  EMAIL_MAX_LENGTH,
  EMAIL_RE,
  PRIVACY_POLICY_PATH,
  REQUEST_TIMEOUT_MS,
  SITE_URL,
} from '../../shared/config/site.js';
import { fetchContactPeople } from './db/contactPeople.js';

const CONTACT_URL = '/api/contact';
const FIELDS = ['email', 'subject', 'message'];

function Contact() {
  const { t, lang } = useTranslations();
  const c = t.contact ?? {};
  const uid = useId();

  const { data: contacts = [], loading, error: loadErr } = useQuery('contact-people', fetchContactPeople);

  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [company, setCompany] = useState('');

  const refs = { email: useRef(null), subject: useRef(null), message: useRef(null) };
  const submitting = status === 'loading';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const fd = new FormData(e.currentTarget);
    const email = fd.get('email')?.toString().trim() ?? '';
    const subject = fd.get('subject')?.toString().trim() ?? '';
    const message = fd.get('message')?.toString().trim() ?? '';

    const errors = {};
    if (!EMAIL_RE.test(email)) errors.email = c.invalidEmail || 'Podaj poprawny adres e-mail.';
    if (!subject) errors.subject = c.missingSubject || 'Wpisz tytuł wiadomości.';
    if (!message) errors.message = c.missingMessage || 'Wpisz treść wiadomości.';
    setFieldErrors(errors);

    const firstInvalid = FIELDS.find((k) => errors[k]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    setStatus('loading');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const captcha = await getCaptchaToken({ signal: controller.signal });
      const res = await fetch(CONTACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, subject, message, company, captcha, locale: lang }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('ok');
    } catch (err) {
      console.error('Contact form error:', err);
      setStatus('error');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const fieldProps = (key) => ({
    ref: refs[key],
    'aria-invalid': fieldErrors[key] ? 'true' : 'false',
    'aria-describedby': fieldErrors[key] ? `${uid}-${key}-error` : undefined,
  });

  const fieldError = (key) =>
    fieldErrors[key] ? (
      <p id={`${uid}-${key}-error`} className="formError">
        {fieldErrors[key]}
      </p>
    ) : null;

  return (
    <main className="contact">
      <Seo
        title={t.seo?.contact?.title ?? 'Kontakt | Młodzieżowy Strajk Klimatyczny'}
        description={t.seo?.contact?.description}
        url={`${SITE_URL}/${lang}/kontakt`}
      />
      <div className="page-intro">
        <h1>{c.h1 || 'Kontakt'}</h1>
        <span className="section-divider" aria-hidden="true" />
      </div>

      <div className="panel form-container">
        {status === 'ok' ? (
          <div className="formConfirmation" role="status">
            <i className="bi bi-envelope-check emptyStateIcon" aria-hidden="true" />
            <h2>{c.sentTitle || 'Wiadomość wysłana'}</h2>
            <p>{c.sent || 'Dziękujemy! Odpowiemy na podany adres e-mail.'}</p>
            <button type="button" className="primaryBtn" onClick={() => setStatus('idle')}>
              {c.sendAnother || 'Napisz kolejną wiadomość'}
            </button>
          </div>
        ) : (
          <form
            className="contact-form"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={submitting ? 'true' : 'false'}
          >
            <Honeypot id={`${uid}-company`} value={company} onChange={setCompany} />

            <label className="formLabel" htmlFor={`${uid}-email`}>
              {c.email || 'E-mail'}
            </label>
            <input
              className="formField"
              id={`${uid}-email`}
              name="email"
              type="email"
              placeholder="email@example.com"
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              required
              {...fieldProps('email')}
            />
            {fieldError('email')}

            <label className="formLabel" htmlFor={`${uid}-subject`}>
              {c.title || 'Tytuł'}
            </label>
            <input
              className="formField"
              name="subject"
              id={`${uid}-subject`}
              type="text"
              maxLength={CONTACT_LIMITS.subject}
              required
              {...fieldProps('subject')}
            />
            {fieldError('subject')}

            <label className="formLabel" htmlFor={`${uid}-message`}>
              {c.message || 'Wiadomość'}
            </label>
            <textarea
              className="formField"
              name="message"
              id={`${uid}-message`}
              rows={6}
              maxLength={CONTACT_LIMITS.message}
              required
              {...fieldProps('message')}
            />
            {fieldError('message')}

            <p className="agreement privacy-notice">
              {c.privacyNotice ||
                'Administratorem Twoich danych jest Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego. Użyjemy ich tylko, żeby odpowiedzieć na wiadomość.'}{' '}
              <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer">
                {t.cookies?.policy ?? 'Polityka prywatności'}
                <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
              </a>
            </p>

            <div className="buttonContainer">
              <button className="primaryBtn" type="submit" aria-disabled={submitting ? 'true' : 'false'}>
                {submitting ? c.pending || 'Wysyłanie…' : c.b1 || 'Wyślij'}
              </button>
            </div>
            {/* Region na stale w DOM, zeby czytniki ekranu oglaszaly zmiany komunikatu. */}
            <div role="status" aria-live="polite">
              {status === 'error' && (
                <p className="formStatus formStatus--error" role="alert">
                  {c.failed || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.'}
                </p>
              )}
            </div>
          </form>
        )}
      </div>

      <section className="contact-persons" data-reveal aria-busy={loading ? 'true' : 'false'}>
        {loading && <Loader />}

        {!loading && loadErr && <p role="alert">{c.loadError ?? 'Nie udało się wczytać kontaktów.'}</p>}

        {!loading &&
          !loadErr &&
          contacts.map((p) => {
            const tel = p.phone ? p.phone.replace(/\s+/g, '') : '';
            return (
              <article className="contact-person" key={p.id}>
                <div className="iconContainer" aria-hidden="true">
                  <i className="bi bi-person-fill" aria-hidden="true" />
                </div>
                <h2 className="personName">{p.name}</h2>
                {p.city && <p className="personCity">{p.city}</p>}
                {p.phone && (
                  <p className="contactLink">
                    <strong>
                      <i className="bi bi-telephone-fill" aria-hidden="true" />
                      <span className="sr-only">{c.call ?? 'Zadzwoń:'} </span>
                      <a href={`tel:${tel}`}>{p.phone}</a>
                    </strong>
                  </p>
                )}
                {p.email && (
                  <p className="contactLink">
                    <strong>
                      <i className="bi bi-envelope-fill" aria-hidden="true" />
                      <span className="sr-only">{c.write ?? 'Napisz:'} </span>
                      <a href={`mailto:${p.email}`}>{p.email}</a>
                    </strong>
                  </p>
                )}
              </article>
            );
          })}
      </section>
    </main>
  );
}

export default Contact;
