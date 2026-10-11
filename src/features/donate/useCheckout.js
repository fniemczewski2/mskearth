import { useEffect, useRef, useState } from 'react';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newAttemptId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Wspolna logika przekierowania do Stripe Checkout dla obu formularzy darowizn. */
export default function useCheckout({ t, lang }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
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

      try {
        (window.top ?? window).location.assign(data.url);
      } catch {
        // Osadzony iframe bez allow-top-navigation: otworz platnosc w nowej karcie.
        window.open(data.url, '_blank', 'noopener');
        setBusy(false);
      }
    } catch (e) {
      // Nowa proba = nowy klucz idempotencji.
      attemptRef.current = newAttemptId();
      setErr(e.message || t.donate?.serverError || 'Wystąpił błąd po stronie serwera.');
      setBusy(false);
    }
  }

  return { busy, err, startPayment };
}
