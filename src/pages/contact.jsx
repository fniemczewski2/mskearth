import { useEffect, useMemo, useState } from 'react';
import '../style/contact.css';
import '../style/forms.css';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const LOCALE_CACHE = new Map();
const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/biuro@fpmsk.org.pl';

function Contact() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [t, setT] = useState({ paths: [], cities: {}, contact: {} });

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // UI state for form submit
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState(null); // "ok" | "error"

  // Translations (with tiny in-memory cache)
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
        console.error('Error loading translations:', e);
        if (active) setT({ paths: [], cities: {}, contact: {} });
      }
    })();
    return () => { active = false; };
  }, [language]);

  // Fetch contact people from Supabase
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const { data, error } = await supabase
          .from('contact_people') // adjust table if different
          .select('id,name,city,phone,email')
          .order('city', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        if (active) setContacts(data || []);
      } catch (e) {
        console.error('Error fetching contact people:', e);
        if (active) {
          setContacts([]);
          setErr('Nie udało się wczytać kontaktów.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setStatusType(null);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    // Simple front-end validation
    const email = fd.get('email')?.toString().trim();
    const subject = fd.get('_subject')?.toString().trim();
    const message = fd.get('message')?.toString().trim();
    const agreement = formEl.querySelector('#agreement')?.checked;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatusMsg(t.contact?.invalidEmail || 'Nieprawidłowy e-mail.');
      setStatusType('error');
      return;
    }
    if (!subject || !message || !agreement) {
      setStatusMsg(t.contact?.fillAll || 'Proszę uzupełnić wszystkie wymagane pola.');
      setStatusType('error');
      return;
    }

    // Optional anti-bot honeypot (hidden input named _hp)
    if (fd.get('_hp')) {
      setStatusMsg('Bot submission blocked.');
      setStatusType('error');
      return;
    }

    fd.set('_captcha', 'false');
    fd.set('_template', 'table');
    setSubmitting(true);
    try {
      const res = await fetch(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        body: fd,
      });

      if (res.ok) {
        setStatusMsg(t.contact?.sent || 'Dziękujemy! Wiadomość wysłana.');
        setStatusType('ok');
        formEl.reset();
      } else {
        const text = await res.text();
        console.error('FormSubmit error:', text);
        setStatusMsg(t.contact?.failed || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
        setStatusType('error');
      }
    } catch (e) {
      console.error('FormSubmit network error:', e);
      setStatusMsg(t.contact?.failed || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
      setStatusType('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="contact">
      <h1>{t.contact?.h1 || 'Kontakt'}</h1>

      {/* Contact form */}
      <aside className="form-container">
        <form id="form" className="contact-form" onSubmit={handleSubmit} noValidate>
          {/* Honeypot (hidden) */}
          <input
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
          />

          <label className="formLabel" htmlFor="email">{t.contact?.email || 'E-mail'}</label>
          <input
            className="formField"
            id="email"
            name="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            required
            aria-required="true"
          />

          <label className="formLabel" htmlFor="title">{t.contact?.title || 'Tytuł'}</label>
          <input
            className="formField"
            name="_subject"
            id="title"
            type="text"
            required
            aria-required="true"
          />

          <label className="formLabel" htmlFor="content">{t.contact?.message || 'Wiadomość'}</label>
          <textarea
            className="formField"
            name="message"
            id="content"
            rows={6}
            required
            aria-required="true"
          />

          <div className="agreementContainer">
            <input type="checkbox" id="agreement" required aria-required="true" />
            <label className="agreement" htmlFor="agreement">
              {t.contact?.consent || 'Wyrażam zgodę na przetwarzanie danych…'}
            </label>
          </div>
          <div className="buttonContainer">
            <button className="primaryBtn" type="submit" disabled={submitting}>
              {submitting ? (t.contact?.pending || 'Wysyłanie…') : (t.contact?.b1 || 'Wyślij')}
            </button>
          </div>  
          {statusMsg && (
            <p
              className={`formStatus ${statusType === 'ok' ? 'formStatus--ok' : 'formStatus--error'}`}
              role={statusType === 'ok' ? 'status' : 'alert'}
              aria-live="polite"
            >
              {statusMsg}
            </p>
          )}
        </form>
      </aside>

      {/* Contact persons */}
      <section className="contact-persons" aria-busy={loading ? 'true' : 'false'}>
        {loading && (
          <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
            <span className="spinner" aria-hidden="true" />
          </div>
        )}

        {!loading && err && <p role="alert">{err}</p>}

        {!loading && !err && contacts.length > 0 && contacts.map((c) => {
          const tel = c.phone ? c.phone.replace(/\s+/g, '') : '';
          const mail = c.email || '';
          return (
            <article className="contact-person" key={c.id}>
              <div className="iconContainer" aria-hidden="true">
                <i className="bi bi-person-fill" aria-hidden="true" />
              </div>
              <h3 className="personName">{c.name}</h3>
              {c.city && <h4 className="personCity">{c.city}</h4>}
              {c.phone && (
                <p className="contactLink">
                  <strong>
                    <i className="bi bi-telephone-fill" aria-hidden="true" />&nbsp;
                    <a href={`tel:${tel}`} aria-label={`Zadzwoń do ${c.name}`}>{c.phone}</a>
                  </strong>
                </p>
              )}
              {c.email && (
                <p className="contactLink">
                  <strong>
                    <i className="bi bi-envelope-fill" aria-hidden="true" />&nbsp;
                    <a href={`mailto:${mail}`} aria-label={`Napisz do ${c.name}`}>{c.email}</a>
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
