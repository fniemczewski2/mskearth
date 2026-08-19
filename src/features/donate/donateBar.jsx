import { useMemo, useState } from 'react';

import { useDonationStats } from './db/donationStats.js';
import { useTranslations } from '../../shared/i18n/useTranslations.js';

const AMOUNTS = [30, 50, 100];

export default function DonateBar() {
  const { t, lang } = useTranslations();
  const { goalAmount, currentAmount, loading } = useDonationStats();

  const [amount, setAmount] = useState(50);
  const [isRecurring, setIsRecurring] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canPay = emailValid && consent && !busy;

  const progress = useMemo(
    () => (goalAmount > 0 ? Math.min((currentAmount / goalAmount) * 100, 100) : 0),
    [currentAmount, goalAmount]
  );

  const currency = t.donate?.currencySuffix ?? 'zł';
  const format = (value) => new Intl.NumberFormat('pl-PL').format(Math.round(value || 0));

  async function startPayment() {
    if (!canPay) return;
    setBusy(true);
    setErr('');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
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
        throw new Error(data?.error ?? 'Nie udało się utworzyć płatności.');
      }

      (window.top ?? window).location.assign(data.url);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <section className="donateBar" aria-label={t.donate?.h2 ?? 'Wesprzyj MSK'}>
      {!loading && (
        <div
          className="donateBar__progress"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Zebrano ${format(currentAmount)} ${currency} z ${format(goalAmount)} ${currency}`}
        >
          <span className="donateBar__fill" style={{ width: `${progress}%` }} />
          <span className="donateBar__figure">
            {format(currentAmount)} / {format(goalAmount)} {currency}
          </span>
        </div>
      )}

      <div className="donateBar__fields">
        <label className="sr-only" htmlFor="bar-name">{t.donate?.nameLabel ?? 'Imię'}</label>
        <input
          id="bar-name"
          className="formField"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.donate?.namePlaceholder ?? 'Imię'}
          autoComplete="name"
          maxLength={120}
        />

        <label className="sr-only" htmlFor="bar-email">{t.donate?.emailLabel ?? 'E-mail'}</label>
        <input
          id="bar-email"
          className="formField"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          autoComplete="email"
          required
          aria-invalid={email && !emailValid ? 'true' : 'false'}
        />
      </div>

      <div className="donateBar__row" role="group" aria-label={t.donate?.paymentType ?? 'Rodzaj wsparcia'}>
        <button type="button" aria-pressed={!isRecurring} onClick={() => setIsRecurring(false)}>
          {t.donate?.onetime ?? 'Jednorazowo'}
        </button>
        <button type="button" aria-pressed={isRecurring} onClick={() => setIsRecurring(true)}>
          {t.donate?.recurring ?? 'Co miesiąc'}
        </button>
      </div>

      <div className="donateBar__row" role="group" aria-label={t.donate?.amountsAria ?? 'Wybierz kwotę'}>
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
            id="bar-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <label className="agreement" htmlFor="bar-consent">
            {t.donate?.consent ?? 'Zgadzam się na przetwarzanie danych w celu realizacji darowizny.'}
          </label>
        </div>

        <div className="agreementContainer">
          <input
            id="bar-newsletter"
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
          />
          <label className="agreement" htmlFor="bar-newsletter">
            {t.donate?.newsletter ?? 'Chcę dostawać informacje o działaniach fundacji.'}
          </label>
        </div>
      </div>

      {err && <p className="formError" role="alert">{err}</p>}

      <button
        type="button"
        className="primaryBtn donateBar__submit"
        disabled={!canPay}
        onClick={startPayment}
        aria-busy={busy ? 'true' : 'false'}
      >
        {busy ? (t.donate?.redirecting ?? 'Przekierowywanie…') : `${t.donate?.payCta ?? 'Wpłać'} ${amount} ${currency}`}
      </button>
    </section>
  );
}
