import { useId, useRef, useState } from 'react';

import { useTranslations } from '../../shared/i18n/useTranslations.js';
import useCheckout, { EMAIL_RE } from './useCheckout.js';
import './donate.css';

const AMOUNTS = [
  { id: 0, amount: 70, desc: 'Godzina warsztatu dla\u00A0jednej\u00A0klasy' },
  { id: 1, amount: 130, desc: 'Dzień warsztatów dla\u00A0jednej\u00A0szkoły' },
  { id: 2, amount: 200, desc: 'Szkolenie osoby prowadzącej' },
];

export default function DonateStripe({ headingLevel = 2, hideHeading = false }) {
  const { t, lang } = useTranslations();
  const d = t.donate ?? {};
  const uid = useId();
  const ids = {
    custom: `${uid}-amount`,
    customError: `${uid}-amount-error`,
    name: `${uid}-name`,
    email: `${uid}-email`,
    emailError: `${uid}-email-error`,
    newsletter: `${uid}-newsletter`,
    notice: `${uid}-notice`,
  };

  const [amount, setAmount] = useState(130);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailRef = useRef(null);
  const customRef = useRef(null);
  const { busy, err, fallbackUrl, startPayment } = useCheckout({ t, lang });

  const finalAmount = showCustom ? Number(customAmount) : amount;
  const amountValid = Number.isFinite(finalAmount) && finalAmount >= 5 && finalAmount <= 50_000;
  const emailValid = EMAIL_RE.test(email.trim());

  const currencySuffix = d.currencySuffix ?? 'zł';
  const formatAmount = (num) =>
    new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'pl-PL', { maximumFractionDigits: 2 }).format(num || 0);

  const showAmountError = (submitted || customAmount !== '') && showCustom && !amountValid;
  const showEmailError = (submitted || email !== '') && !emailValid;
  const emailErrorText = email.trim() === ''
    ? (d.emailRequired ?? 'Podaj adres e-mail – wyślemy na niego potwierdzenie.')
    : (d.invalidEmail ?? 'Podaj poprawny adres e-mail.');

  function handlePay() {
    setSubmitted(true);
    // Przycisk jest zawsze aktywny, a brakujace pole dostaje komunikat i fokus (WCAG 3.3.1).
    if (showCustom && !amountValid) {
      customRef.current?.focus();
      return;
    }
    if (!emailValid) {
      emailRef.current?.focus();
      return;
    }
    startPayment({ amount: finalAmount, name, email: email.trim(), newsletter, isRecurring });
  }

  const Heading = `h${headingLevel}`;

  return (
    <>
      {!hideHeading && <Heading>{d.h2 ?? 'Wesprzyj nas!'}</Heading>}

      <div className="panel donate">
        <div className="payment-type" role="group" aria-label={d.paymentType ?? 'Rodzaj wsparcia'}>
          <button
            type="button"
            className={!isRecurring ? 'active' : undefined}
            aria-pressed={!isRecurring}
            onClick={() => setIsRecurring(false)}
          >
            {d.onetime ?? 'Jednorazowo'}
          </button>
          <button
            type="button"
            className={isRecurring ? 'active' : undefined}
            aria-pressed={isRecurring}
            onClick={() => setIsRecurring(true)}
          >
            {d.recurring ?? 'Co miesiąc'}
          </button>
        </div>

        <div className="amounts" role="group" aria-label={d.amountsAria ?? 'Wybierz kwotę darowizny'}>
          {AMOUNTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setAmount(v.amount);
                setShowCustom(false);
                setCustomAmount('');
              }}
              className={!showCustom && amount === v.amount ? 'active' : undefined}
              aria-pressed={!showCustom && amount === v.amount}
            >
              <span className="amount">{v.amount}{'\u00A0'}{currencySuffix}</span>
              <span className="desc">{d.descriptions?.[v.id] ?? v.desc}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowCustom(true);
              requestAnimationFrame(() => customRef.current?.focus());
            }}
            className={showCustom ? 'active' : undefined}
            aria-pressed={showCustom}
          >
            {d.customAmount ?? 'Inna kwota'}
          </button>
        </div>

        {showCustom && (
          <div className="custom-amount-container">
            <label className="formLabel" htmlFor={ids.custom}>
              {d.customAmountLabel ?? 'Wpisz kwotę:'}
            </label>
            <div className="input-with-suffix">
              <input
                id={ids.custom}
                ref={customRef}
                type="number"
                min="5"
                max="50000"
                step="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="formField"
                placeholder="50"
                inputMode="numeric"
                aria-invalid={showAmountError ? 'true' : 'false'}
                aria-describedby={showAmountError ? ids.customError : undefined}
              />
              <span className="input-suffix" aria-hidden="true">{currencySuffix}</span>
            </div>
            {showAmountError && (
              <p id={ids.customError} className="formError">
                {d.invalidAmount ?? 'Kwota musi mieścić się w przedziale 5–50 000 zł.'}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="formLabel" htmlFor={ids.name}>
            {d.nameLabel ?? 'Imię:'}
          </label>
          <input
            id={ids.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="formField"
            placeholder={d.namePlaceholder ?? 'Anna'}
            autoComplete="name"
            maxLength={120}
          />

          <label className="formLabel" htmlFor={ids.email}>
            {d.emailLabel ?? 'E-mail:'} <span aria-hidden="true" className="required-mark">*</span>
          </label>
          <input
            id={ids.email}
            ref={emailRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="formField"
            placeholder={d.emailPlaceholder ?? 'jan@example.com'}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={showEmailError ? 'true' : 'false'}
            aria-describedby={showEmailError ? ids.emailError : undefined}
          />
          {showEmailError && (
            <p id={ids.emailError} className="formError">
              {emailErrorText}
            </p>
          )}
        </div>

        <div className="agreementContainer">
          <input
            id={ids.newsletter}
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
          />
          <label className="agreement" htmlFor={ids.newsletter}>
            {d.newsletter ?? 'Chcę otrzymywać newsletter fundacji na podany adres e-mail (opcjonalnie).'}
          </label>
        </div>

        <p id={ids.notice} className="agreement privacy-notice">
          {d.privacyNotice ??
            'Darowiznę otrzymuje Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego. Twoje dane przetwarzamy, żeby zrealizować darowiznę. Płatność obsługuje Stripe.'}{' '}
          <a href="/polityka-prywatnosci.pdf" target="_blank" rel="noopener noreferrer">
            {t.cookies?.policy ?? 'Polityka prywatności'}
            <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
          </a>
        </p>

        {fallbackUrl && (
          <p className="formStatus" role="status">
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
              {d.openCheckout ?? 'Jeśli płatność się nie otworzyła, kliknij tutaj'}
              <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
            </a>
          </p>
        )}

        {err && (
          <p role="alert" className="formError" style={{ marginTop: 8, marginBottom: 16 }}>
            {err}
          </p>
        )}

        <div className="buttonContainer">
          <button
            type="button"
            className="primaryBtn"
            onClick={handlePay}
            aria-disabled={busy ? 'true' : 'false'}
            aria-describedby={ids.notice}
          >
            {busy
              ? (d.redirecting ?? 'Przekierowywanie…')
              : `${d.payCta ?? 'Wpłać'} ${amountValid ? formatAmount(finalAmount) : '–'} ${currencySuffix}${
                  isRecurring ? (d.monthlySuffix ?? ' / mies.') : ''
                }`}
          </button>
        </div>

        <div className="trust-indicators">
          <p className="trust-text">
            <i className="bi bi-shield-check" aria-hidden="true" />
            &nbsp;{d.secure ?? 'Bezpieczna płatność przez Stripe'}
          </p>
          <p className="trust-text">
            <i className="bi bi-receipt" aria-hidden="true" />
            &nbsp;{d.receipt ?? 'Po zaksięgowaniu płatności dostaniesz potwierdzenie e-mailem.'}
          </p>
        </div>
      </div>
    </>
  );
}
