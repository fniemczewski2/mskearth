import { useEffect, useRef, useState } from 'react';

import { supabase } from '../../services/supabaseClient';
import Seo from '../../shared/components/Seo.jsx';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { SITE_URL } from '../../shared/config/site.js';

const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/biuro@fpmsk.org.pl';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Contact() {
  const { t, lang } = useTranslations();
  const c = t.contact ?? {};

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState(null);

  const refs = { email: useRef(null), subject: useRef(null), message: useRef(null) };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('contact_people')
          .select('id,name,city,phone,email')
          .order('city', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        if (active) setContacts(data || []);
      } catch (e) {
        console.error('Error fetching contact people:', e);
        if (active) setLoadErr(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setStatusType(null);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    const email = fd.get('email')?.toString().trim() ?? '';
    const subject = fd.get('_subject')?.toString().trim() ?? '';
    const message = fd.get('message')?.toString().trim() ?? '';

    const errors = {};
    if (!EMAIL_RE.test(email)) errors.email = c.invalidEmail || 'Podaj poprawny adres e-mail.';
    if (!subject) errors.subject = c.missingSubject || 'Wpisz tytuł wiadomości.';
    if (!message) errors.message = c.missingMessage || 'Wpisz treść wiadomości.';
    setFieldErrors(errors);

    const firstInvalid = ['email', 'subject', 'message'].find((k) => errors[k]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    // Pole-pulapka FormSubmit (_honey) odrzuca boty takze po stronie serwisu.
    if (fd.get('_honey')) return;

    fd.set('_captcha', 'false');
    fd.set('_template', 'table');
    setSubmitting(true);
    try {
      const res = await fetch(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });

      if (res.ok) {
        setStatusMsg(c.sent || 'Dziękujemy! Wiadomość wysłana.');
        setStatusType('ok');
        formEl.reset();
      } else {
        console.error('FormSubmit error:', await res.text());
        setStatusMsg(c.failed || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
        setStatusType('error');
      }
    } catch (err) {
      console.error('FormSubmit network error:', err);
      setStatusMsg(c.failed || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
      setStatusType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = (key) => ({
    ref: refs[key],
    'aria-invalid': fieldErrors[key] ? 'true' : 'false',
    'aria-describedby': fieldErrors[key] ? `contact-${key}-error` : undefined,
  });

  const fieldError = (key) =>
    fieldErrors[key] ? (
      <p id={`contact-${key}-error`} className="formError">
        {fieldErrors[key]}
      </p>
    ) : null;

  return (
    <main className="contact">
      <Seo
        title={t.seo?.contact?.title ?? 'Kontakt – Młodzieżowy Strajk Klimatyczny'}
        description={t.seo?.contact?.description}
        url={`${SITE_URL}/${lang}/kontakt`}
      />
      <div className="page-intro">
        <h1>{c.h1 || 'Kontakt'}</h1>
        <span className="section-divider" aria-hidden="true" />
      </div>

      <div className="panel form-container">
        <form id="form" className="contact-form" onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            name="_honey"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
          />

          <label className="formLabel" htmlFor="contact-email">{c.email || 'E-mail'}</label>
          <input
            className="formField"
            id="contact-email"
            name="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            required
            {...fieldProps('email')}
          />
          {fieldError('email')}

          <label className="formLabel" htmlFor="contact-subject">{c.title || 'Tytuł'}</label>
          <input className="formField" name="_subject" id="contact-subject" type="text" required {...fieldProps('subject')} />
          {fieldError('subject')}

          <label className="formLabel" htmlFor="contact-message">{c.message || 'Wiadomość'}</label>
          <textarea className="formField" name="message" id="contact-message" rows={6} required {...fieldProps('message')} />
          {fieldError('message')}

          <p className="agreement privacy-notice">
            {c.privacyNotice ||
              'Administratorem Twoich danych jest Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego. Użyjemy ich tylko, żeby odpowiedzieć na wiadomość.'}{' '}
            <a href="/polityka-prywatnosci.pdf" target="_blank" rel="noopener noreferrer">
              {t.cookies?.policy ?? 'Polityka prywatności'}
              <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
            </a>
          </p>

          <div className="buttonContainer">
            <button className="primaryBtn" type="submit" aria-disabled={submitting ? 'true' : 'false'}>
              {submitting ? (c.pending || 'Wysyłanie…') : (c.b1 || 'Wyślij')}
            </button>
          </div>
          <div role={statusType === 'error' ? 'alert' : 'status'}>
            {statusMsg && (
              <p className={`formStatus ${statusType === 'ok' ? 'formStatus--ok' : 'formStatus--error'}`}>
                {statusMsg}
              </p>
            )}
          </div>
        </form>
      </div>

      <section className="contact-persons" data-reveal aria-busy={loading ? 'true' : 'false'}>
        {loading && (
          <div className="loader" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
          </div>
        )}

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
                      <span className="sr-only">{c.call ?? 'Zadzwoń:'} </span>&nbsp;
                      <a href={`tel:${tel}`}>{p.phone}</a>
                    </strong>
                  </p>
                )}
                {p.email && (
                  <p className="contactLink">
                    <strong>
                      <i className="bi bi-envelope-fill" aria-hidden="true" />
                      <span className="sr-only">{c.write ?? 'Napisz:'} </span>&nbsp;
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
