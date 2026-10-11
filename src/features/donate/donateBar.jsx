import { useId, useMemo, useRef, useState } from 'react';

import { useDonationStats } from './db/donationStats.js';
import { format, useTranslations } from '../../shared/i18n/useTranslations.js';
import useCheckout, { EMAIL_RE } from './useCheckout.js';

const AMOUNTS = [30, 50, 100];

export default function DonateBar() {
  const { t, lang } = useTranslations();
  const d = t.donate ?? {};
  const { goalAmount, currentAmount, loading } = useDonationStats();
  const uid = useId();

  const [amount, setAmount] = useState(50);
  const [isRecurring, setIsRecurring] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const emailRef = useRef(null);
  const { busy, err, startPayment } = useCheckout({ t, lang });

  const emailValid = EMAIL_RE.test(email.trim());
  const showEmailError = (submitted || email !== '') && !emailValid;

  const progress = useMemo(
    () => (goalAmount > 0 ? Math.min((currentAmount / goalAmount) * 100, 100) : 0),
    [currentAmount, goalAmount]
  );

  const currency = d.currencySuffix ?? 'zł';
  const fmt = (value) =>
    new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'pl-PL').format(Math.round(value || 0));

  function handlePay() {
    setSubmitted(true);
    if (!emailValid) {
      emailRef.current?.focus();
      return;
    }
    startPayment({ amount, name, email: email.trim(), newsletter, isRecurring });
  }

  return (
    <section className="donateBar" aria-label={d.h2 ?? 'Wesprzyj MSK'}>
      {!loading && (
        <div
          className="donateBar__progress"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={format(d.progress ?? 'Zebrano {current} z {goal}', {
            current: `${fmt(currentAmount)} ${currency}`,
            goal: `${fmt(goalAmount)} ${currency}`,
          })}
        >
          <span className="donateBar__fill" style={{ width: `${progress}%` }} />
          <span className="donateBar__figure" aria-hidden="true">
            {fmt(currentAmount)} / {fmt(goalAmount)} {currency}
          </span>
        </div>
      )}

      <div className="donateBar__fields">
        <label className="sr-only" htmlFor={`${uid}-name`}>{d.nameLabel ?? 'Imię'}</label>
        <input
          id={`${uid}-name`}
          className="formField"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={d.namePlaceholder ?? 'Imię'}
          autoComplete="name"
          maxLength={120}
        />

        <label className="sr-only" htmlFor={`${uid}-email`}>{d.emailLabel ?? 'E-mail'}</label>
        <input
          id={`${uid}-email`}
          ref={emailRef}
          className="formField"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          autoComplete="email"
          required
          aria-invalid={showEmailError ? 'true' : 'false'}
          aria-describedby={showEmailError ? `${uid}-email-error` : undefined}
        />
      </div>
      {showEmailError && (
        <p id={`${uid}-email-error`} className="formError">
          {email.trim() === ''
            ? (d.emailRequired ?? 'Podaj adres e-mail – wyślemy na niego potwierdzenie.')
            : (d.invalidEmail ?? 'Podaj poprawny adres e-mail.')}
        </p>
      )}

      <div className="donateBar__row" role="group" aria-label={d.paymentType ?? 'Rodzaj wsparcia'}>
        <button type="button" aria-pressed={!isRecurring} onClick={() => setIsRecurring(false)}>
          {d.onetime ?? 'Jednorazowo'}
        </button>
        <button type="button" aria-pressed={isRecurring} onClick={() => setIsRecurring(true)}>
          {d.recurring ?? 'Co miesiąc'}
        </button>
      </div>

      <div className="donateBar__row" role="group" aria-label={d.amountsAria ?? 'Wybierz kwotę'}>
        {AMOUNTS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={amount === value}
            onClick={() => setAmount(value)}
          >
            {value}&nbsp;{currency}
          </button>
        ))}
      </div>

      <div className="donateBar__consents">
        <div className="agreementContainer">
          <input
            id={`${uid}-newsletter`}
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
          />
          <label className="agreement" htmlFor={`${uid}-newsletter`}>
            {d.newsletter ?? 'Chcę otrzymywać newsletter fundacji (opcjonalnie).'}
          </label>
        </div>
        <p id={`${uid}-notice`} className="agreement privacy-notice">
          {d.privacyNotice ?? 'Darowiznę otrzymuje Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego.'}
        </p>
      </div>

      {err && <p className="formError" role="alert">{err}</p>}

      <button
        type="button"
        className="primaryBtn donateBar__submit"
        onClick={handlePay}
        aria-disabled={busy ? 'true' : 'false'}
        aria-describedby={`${uid}-notice`}
      >
        {busy
          ? (d.redirecting ?? 'Przekierowywanie…')
          : `${d.payCta ?? 'Wpłać'} ${amount} ${currency}${isRecurring ? (d.monthlySuffix ?? ' / mies.') : ''}`}
      </button>
    </section>
  );
}
