import { useMemo, useState } from 'react';

import { useTranslations } from '../../shared/i18n/useTranslations.js';
import './donate.css';

export default function DonateStripe() {
  const { t, lang } = useTranslations();

  const amounts = useMemo(
    () => [
      { id: 0, amount: 70, desc: 'godzina warsztatu dla\u00A01\u00A0klasy' },
      { id: 1, amount: 130, desc: 'dzień warsztatów dla\u00A01\u00A0szkoły' },
      { id: 2, amount: 200, desc: 'szkolenie osoby prowadzącej' },
    ],
    []
  );

  const [amount, setAmount] = useState(130);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const finalAmount = showCustom && customAmount ? Number(customAmount) : amount;
  const amountValid = Number.isFinite(finalAmount) && finalAmount >= 5 && finalAmount <= 50_000;
  const canPay = amountValid && consent && emailValid && Boolean(email) && !busy;

  const currencySuffix = t.donate?.currencySuffix ?? 'zł';
  const formatAmount = (num) => new Intl.NumberFormat('pl-PL').format(Math.round(num || 0));

  async function startPayment() {
    if (!canPay) return;
    setBusy(true);
    setErr('');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          name,
          email,
          newsletter,
          locale: lang === 'en' ? 'en' : 'pl',
          payment_type: isRecurring ? 'recurring' : 'onetime',
          returnHost: window.location.hostname,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? t.donate?.createPaymentFailed ?? 'Nie udało się utworzyć płatności.');
      }

      const target = window.top ?? window;
      target.location.assign(data.url);
    } catch (e) {
      setErr(e.message || t.donate?.serverError || 'Wystąpił błąd po stronie serwera.');
      setBusy(false);
    }
  }

  return (
    <>
      <h2>{t.donate?.h2 ?? 'Wesprzyj nas!'}</h2>

      <aside className="donate">
        <div className="payment-type" role="group" aria-label="Rodzaj wsparcia">
          <button
            type="button"
            className={!isRecurring ? 'active' : undefined}
            aria-pressed={!isRecurring}
            onClick={() => setIsRecurring(false)}
          >
            {t.donate?.onetime ?? 'Jednorazowo'}
          </button>
          <button
            type="button"
            className={isRecurring ? 'active' : undefined}
            aria-pressed={isRecurring}
            onClick={() => setIsRecurring(true)}
          >
            {t.donate?.recurring ?? 'Co miesiąc'}
          </button>
        </div>

        <div className="amounts" role="group" aria-label={t.donate?.amountsAria ?? 'Wybierz kwotę darowizny'}>
          {amounts.map((v) => (
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
              <p className="amount">{v.amount}{'\u00A0'}{currencySuffix}</p>
              <p className="desc">{t.donate?.descriptions?.[v.id] ?? v.desc}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className={showCustom ? 'active' : undefined}
            aria-pressed={showCustom}
          >
            {t.donate?.customAmount ?? 'Inna kwota'}
          </button>
        </div>

        {showCustom && (
          <div className="custom-amount-container">
            <label className="formLabel" htmlFor="custom-amount">
              {t.donate?.customAmountLabel ?? 'Wpisz kwotę:'}
            </label>
            <div className="input-with-suffix">
              <input
                id="custom-amount"
                type="number"
                min="5"
                max="50000"
                step="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="formField"
                placeholder="50"
                inputMode="numeric"
                aria-label="Niestandardowa kwota darowizny"
                aria-invalid={customAmount && !amountValid ? 'true' : 'false'}
              />
              <span className="input-suffix">{currencySuffix}</span>
            </div>
            {customAmount && !amountValid && (
              <p role="alert" className="formError">
                {t.donate?.invalidAmount ?? 'Kwota musi mieścić się w przedziale 5–50 000 zł.'}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="formLabel" htmlFor="donor-name">
            {t.donate?.nameLabel ?? 'Imię:'}
          </label>
          <input
            id="donor-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="formField"
            placeholder={t.donate?.namePlaceholder ?? 'Anna'}
            autoComplete="name"
            maxLength={120}
          />

          <label className="formLabel" htmlFor="donor-email">
            {t.donate?.emailLabel ?? 'E-mail:'} <span aria-hidden="true" className="required-mark">*</span>
          </label>
          <input
            id="donor-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="formField"
            placeholder={t.donate?.emailPlaceholder ?? 'jan@example.com'}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-required="true"
            aria-invalid={email && !emailValid ? 'true' : 'false'}
            aria-describedby={email && !emailValid ? 'donor-email-error' : undefined}
          />
          {email && !emailValid && (
            <p id="donor-email-error" role="alert" className="formError">
              {t.donate?.invalidEmail ?? 'Podaj poprawny adres e-mail.'}
            </p>
          )}
        </div>

        <div className="agreementContainer">
          <input
            id="donate-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <label className="agreement" htmlFor="donate-consent">
            <span aria-hidden="true" className="required-mark">*</span>{' '}
            {t.donate?.consent ??
              'Wyrażam zgodę na przetwarzanie moich danych osobowych w celu realizacji darowizny.'}
          </label>
        </div>

        <div className="agreementContainer">
          <input
            id="donate-newsletter"
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
          />
          <label className="agreement" htmlFor="donate-newsletter">
            {t.donate?.newsletter ??
              'Wyrażam zgodę na wysyłanie mi informacji o działalności fundacji na podany adres e-mail.'}
          </label>
        </div>

        {err && (
          <p role="alert" className="formError" style={{ marginTop: 8, marginBottom: 16 }}>
            {err}
          </p>
        )}

        <div className="buttonContainer">
          <button
            type="button"
            className="primaryBtn"
            disabled={!canPay}
            onClick={startPayment}
            aria-busy={busy ? 'true' : 'false'}
          >
            <p>
              {busy
                ? (t.donate?.redirecting ?? 'Przekierowywanie…')
                : `${t.donate?.payCta ?? 'Wpłać'} ${formatAmount(finalAmount)} ${currencySuffix}${
                    isRecurring ? (t.donate?.monthlySuffix ?? ' / mies.') : ''
                  }`}
            </p>
          </button>
        </div>

        <div className="trust-indicators">
          <p className="trust-text">
            <i className="bi bi-shield-check" aria-hidden="true" />
            &nbsp;{t.donate?.secure ?? 'Bezpieczna płatność przez Stripe'}
          </p>
          <p className="trust-text">
            <i className="bi bi-receipt" aria-hidden="true" />
            &nbsp;{t.donate?.receipt ?? 'Otrzymasz potwierdzenie na e-mail'}
          </p>
        </div>
      </aside>
    </>
  );
}
