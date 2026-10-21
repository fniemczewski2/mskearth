import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import Seo from '../../shared/components/Seo.jsx';
import { SITE_URL } from '../../shared/config/site.js';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { fetchPublicSurvey } from './db/surveys.js';
import { formatDay, groupByDate, isSelectable } from './slots.js';
import './survey.css';

const BOOK_URL = '/api/survey-book';
const REQUEST_TIMEOUT_MS = 15000;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function SurveyPage() {
  const { slug } = useParams();
  const { t, lang } = useTranslations();
  const s = t.survey ?? {};
  const uid = useId();

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const slotsRef = useRef(null);
  const consentRef = useRef(null);

  const [survey, setSurvey] = useState(undefined); // undefined = laduje, null = brak
  const [loadErr, setLoadErr] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [message, setMessage] = useState('');
  const [booked, setBooked] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchPublicSurvey(slug);
      setSurvey(data);
      setLoadErr(false);
      // Zdejmij zaznaczenie slotow, ktore w miedzyczasie sie zapelnily.
      setSelected((prev) => {
        const ok = new Set(data?.slots?.filter((x) => x.free > 0 && !x.past).map((x) => x.id));
        return new Set([...prev].filter((id) => ok.has(id)));
      });
      return data;
    } catch (err) {
      console.error('Survey load error:', err);
      setLoadErr(true);
      return undefined;
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  // Po udanym zapisie widok sie skraca: wroc na gore i ogloś komunikat czytnikom ekranu.
  useEffect(() => {
    if (status !== 'ok') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const h1 = document.querySelector('main.survey h1');
    h1?.setAttribute('tabindex', '-1');
    h1?.focus({ preventScroll: true });
  }, [status]);

  const days = useMemo(() => groupByDate(survey?.slots ?? []), [survey]);
  const max = survey?.max_slots_per_user ?? 1;

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setFieldErrors((e) => ({ ...e, slots: undefined }));
  };

  const errorFor = (code) => {
    const map = {
      slot_full: s.errSlotFull,
      too_many_slots: s.errTooMany,
      already_booked: s.errAlready,
      slot_past: s.errPast,
      survey_closed: s.errClosed,
      rate_limited: s.errRate,
    };
    return map[code] || s.errGeneric || 'Nie udało się zapisać. Spróbuj ponownie.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;
    if (company.trim()) return;

    const errs = {};
    if (!name.trim()) errs.name = s.errName || 'Podaj imię.';
    if (!EMAIL_RE.test(email.trim())) errs.email = s.errEmail || 'Podaj poprawny adres e-mail.';
    if (selected.size === 0) errs.slots = s.errNoSlots || 'Wybierz co najmniej jeden termin.';
    if (!consent) errs.consent = s.errConsent || 'Zgoda jest wymagana, aby się zapisać.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setStatus('error');
      setMessage('');
      const first = ['name', 'email', 'slots', 'consent'].find((k) => errs[k]);
      ({ name: nameRef, email: emailRef, slots: slotsRef, consent: consentRef })[first].current?.focus();
      return;
    }

    setStatus('loading');
    setMessage('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const resp = await fetch(BOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          email: email.trim(),
          slotIds: [...selected],
          consent,
          company,
        }),
        signal: controller.signal,
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const err = new Error(body.code || `HTTP ${resp.status}`);
        err.code = body.code;
        throw err;
      }
      setBooked(survey.slots.filter((x) => selected.has(x.id)));
      setStatus('ok');
      setSelected(new Set());
    } catch (err) {
      if (err.code === 'slot_full' || err.code === 'slot_past' || err.code === 'survey_closed') await load();
      setStatus('error');
      setMessage(err.name === 'AbortError' ? s.errTimeout || 'Przekroczono czas. Spróbuj ponownie.' : errorFor(err.code));
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const seo = (
    <Seo
      title={`${survey?.title ?? s.seoTitle ?? 'Zapisy na terminy'} – MSK`}
      url={`${SITE_URL}/${lang}/ankieta/${slug}`}
      noindex
    />
  );

  if (survey === undefined && !loadErr) {
    return (
      <main className="survey">
        {seo}
        <div className="loader" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
        </div>
      </main>
    );
  }

  if (loadErr || survey === null) {
    return (
      <main className="survey">
        {seo}
        <div className="page-intro">
          <h1>{loadErr ? s.loadError || 'Nie udało się wczytać ankiety.' : s.notFound || 'Nie znaleziono ankiety.'}</h1>
        </div>
        {loadErr && (
          <div className="buttonContainer">
            <button className="primaryBtn" type="button" onClick={load}>
              {s.retry || 'Spróbuj ponownie'}
            </button>
          </div>
        )}
      </main>
    );
  }

  const fe = (key) => (fieldErrors[key] ? `${uid}-${key}-error` : undefined);
  const errorP = (key) =>
    fieldErrors[key] ? (
      <p id={`${uid}-${key}-error`} className="formError">
        {fieldErrors[key]}
      </p>
    ) : null;

  if (status === 'ok') {
    return (
      <main className="survey">
        {seo}
        <div className="page-intro">
          <h1>{s.thanksTitle || 'Dziękujemy za zapis!'}</h1>
          <span className="section-divider" aria-hidden="true" />
        </div>
        <div className="panel survey-panel" role="status">
          <p>{s.thanksText || 'Zapisaliśmy Cię na wybrane terminy:'}</p>
          <ul className="survey-booked">
            {booked.map((x) => (
              <li key={x.id}>
                {formatDay(x.date, lang)}, {x.start}–{x.end}
              </li>
            ))}
          </ul>
          <p className="agreement">{s.thanksNote}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="survey">
      {seo}
      <div className="page-intro">
        <h1>{survey.title}</h1>
        <span className="section-divider" aria-hidden="true" />
        {survey.description && <p className="survey-description">{survey.description}</p>}
      </div>

      {survey.closed ? (
        <div className="panel survey-panel" role="status">
          <p>{s.closed || 'Zapisy na tę ankietę są zamknięte.'}</p>
        </div>
      ) : (
        <div className="panel survey-panel">
          <form onSubmit={handleSubmit} noValidate aria-busy={status === 'loading' ? 'true' : 'false'}>
            <label aria-hidden="true" htmlFor={`${uid}-company`} style={{ position: 'absolute', left: '-9999px' }}>
              Company
            </label>
            <input
              id={`${uid}-company`}
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />

            <label className="formLabel" htmlFor={`${uid}-name`}>
              {s.name || 'Imię'}
            </label>
            <input
              className="formField"
              id={`${uid}-name`}
              ref={nameRef}
              name="name"
              type="text"
              autoComplete="given-name"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={fieldErrors.name ? 'true' : 'false'}
              aria-describedby={fe('name')}
              required
            />
            {errorP('name')}

            <label className="formLabel" htmlFor={`${uid}-email`}>
              {s.email || 'E-mail'}
            </label>
            <input
              className="formField"
              id={`${uid}-email`}
              ref={emailRef}
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={fieldErrors.email ? 'true' : 'false'}
              aria-describedby={fe('email')}
              required
            />
            {errorP('email')}

            <fieldset
              className="survey-slots"
              ref={slotsRef}
              tabIndex={-1}
              aria-describedby={[`${uid}-limit`, fe('slots')].filter(Boolean).join(' ')}
            >
              <legend className="formLabel">{s.slotsLegend || 'Wybierz terminy'}</legend>
              <p id={`${uid}-limit`} className="survey-limit" aria-live="polite">
                {(s.limit || 'Wybrano {n} z {max}').replace('{n}', selected.size).replace('{max}', max)}
              </p>
              {days.length === 0 && <p>{s.noSlots || 'Brak dostępnych terminów.'}</p>}
              {days.map((day) => (
                <div className="survey-day" key={day.date}>
                  <h2 className="survey-dayTitle">{formatDay(day.date, lang)}</h2>
                  <div className="survey-slotList">
                    {day.slots.map((slot) => {
                      const checked = selected.has(slot.id);
                      const full = slot.free <= 0;
                      const enabled = isSelectable(slot, { selected, max });
                      const hint = slot.past
                        ? s.past || 'minął'
                        : full
                          ? s.full || 'brak miejsc'
                          : (s.free || 'wolne: {n}').replace('{n}', slot.free);
                      return (
                        <label
                          key={slot.id}
                          className={`survey-slot${checked ? ' is-checked' : ''}${!enabled && !checked ? ' is-disabled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!enabled}
                            onChange={() => toggle(slot.id)}
                          />
                          <span className="survey-slotTime">
                            {slot.start}–{slot.end}
                          </span>
                          <span className="survey-slotHint">{hint}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              {errorP('slots')}
            </fieldset>

            <div className="agreementContainer">
              <input
                id={`${uid}-consent`}
                ref={consentRef}
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={fieldErrors.consent ? 'true' : 'false'}
                aria-describedby={[`${uid}-privacy`, fe('consent')].filter(Boolean).join(' ')}
                required
              />
              <label htmlFor={`${uid}-consent`} className="agreement">
                {s.consent ||
                  'Wyrażam zgodę na przetwarzanie moich danych osobowych (imię, e-mail) w celu obsługi zapisu na wybrane terminy.'}
              </label>
            </div>
            {errorP('consent')}

            <p id={`${uid}-privacy`} className="agreement privacy-notice">
              {s.privacyNotice ||
                'Administratorem Twoich danych jest Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego. Zgodę możesz wycofać w każdej chwili, pisząc do nas.'}{' '}
              <a href="/polityka-prywatnosci.pdf" target="_blank" rel="noopener noreferrer">
                {t.cookies?.policy ?? 'Polityka prywatności'}
                <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
              </a>
            </p>

            <div className="buttonContainer">
              <button className="primaryBtn" type="submit" aria-disabled={status === 'loading' ? 'true' : 'false'}>
                {status === 'loading' ? s.sending || 'Zapisywanie…' : s.submit || 'Zapisz mnie'}
              </button>
            </div>

            <div role="status" aria-live="polite">
              {message && (
                <p className="formStatus formStatus--error" role="alert">
                  {message}
                </p>
              )}
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
