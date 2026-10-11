import { useRef, useState } from 'react';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newAttemptId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Wspolna logika przekierowania do Stripe Checkout dla obu formularzy darowizn. */
export default function useCheckout({ t, lang }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const attemptRef = useRef(newAttemptId());

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

      (window.top ?? window).location.assign(data.url);
    } catch (e) {
      // Nowa proba = nowy klucz idempotencji.
      attemptRef.current = newAttemptId();
      setErr(e.message || t.donate?.serverError || 'Wystąpił błąd po stronie serwera.');
      setBusy(false);
    }
  }

  return { busy, err, startPayment };
}
