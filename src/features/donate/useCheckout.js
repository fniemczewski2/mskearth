import { useEffect, useState } from 'react';

import { DEFAULT_LANG, LANGS } from '../../shared/config/site.js';
import { getCaptchaToken } from '../../shared/lib/captcha.js';

function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Wspolna logika przekierowania do Stripe Checkout dla obu formularzy darowizn. */
export default function useCheckout({ t, lang }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');

  // Powrot z Stripe przyciskiem "Wstecz" przywraca strone z bfcache razem ze stanem
  // busy=true: odblokuj przycisk.
  useEffect(() => {
    const onPageShow = (e) => {
      if (!e.persisted) return;
      setBusy(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  async function startPayment({ amount, name, email, newsletter, isRecurring }) {
    if (busy) return;
    setBusy(true);
    setErr('');
    setFallbackUrl('');

    try {
      const captcha = await getCaptchaToken();
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          name,
          email,
          newsletter,
          locale: LANGS.includes(lang) ? lang : DEFAULT_LANG,
          payment_type: isRecurring ? 'recurring' : 'onetime',
          returnHost: window.location.hostname,
          captcha,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? t.donate?.createPaymentFailed ?? 'Nie udało się utworzyć płatności.');
      }

      if (!isEmbedded()) {
        window.location.assign(data.url);
        return;
      }

      // W ramce u partnera nawigacja okna nadrzednego bywa zablokowana (sandbox,
      // brak aktywacji uzytkownika po await). Przegladarka nie zawsze rzuca wtedy
      // wyjatek, wiec zawsze pokazujemy tez link, ktory zadziala po kliknieciu.
      setFallbackUrl(data.url);
      setBusy(false);
      try {
        window.top.location.assign(data.url);
      } catch {
        window.open(data.url, '_blank', 'noopener');
      }
    } catch (e) {
      setErr(e.message || t.donate?.serverError || 'Wystąpił błąd po stronie serwera.');
      setBusy(false);
    }
  }

  return { busy, err, fallbackUrl, startPayment };
}
