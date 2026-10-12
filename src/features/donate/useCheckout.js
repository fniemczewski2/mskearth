import { useEffect, useRef, useState } from 'react';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function newAttemptId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Wspolna logika przekierowania do Stripe Checkout dla obu formularzy darowizn. */
export default function useCheckout({ t, lang }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const attemptRef = useRef(newAttemptId());

  // Powrot z Stripe przyciskiem "Wstecz" przywraca strone z bfcache razem ze stanem
  // busy=true: odblokuj przycisk i uzyj nowego klucza idempotencji.
  useEffect(() => {
    const onPageShow = (e) => {
      if (!e.persisted) return;
      attemptRef.current = newAttemptId();
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
          attemptId: attemptRef.current,
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
      // Nowa proba = nowy klucz idempotencji.
      attemptRef.current = newAttemptId();
      setErr(e.message || t.donate?.serverError || 'Wystąpił błąd po stronie serwera.');
      setBusy(false);
    }
  }

  return { busy, err, fallbackUrl, startPayment };
}
