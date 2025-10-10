import { useMemo, useState } from 'react';

export default function DonateWidget() {
  // preset amounts (PLN). Adjust as you like.
  const amounts = useMemo(() => [10, 20, 50], []);
  const [amount, setAmount] = useState(amounts[1]); // default 20 zł

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const emailValid = !email || /^\S+@\S+\.\S+$/.test(email);

  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const canPay = consent && emailValid && !!email && !!amount && !busy;

const startPayment = async () => {
  if (!canPay) return;
  setBusy(true);
  setErr('');

  try {
    const extOrderId = `DON-${Date.now()}`;

    const resp = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // nudge server/proxy to return JSON
      },
      body: JSON.stringify({
        total: Number(amount),
        email,
        firstName: name || 'Donor',
        description: `Darowizna ${amount} PLN`,
        orderId: extOrderId,
      }),
    });

    // ---- SAFE PARSE (handles empty/HTML responses) ----
    const contentType = resp.headers.get('content-type') || '';
    const raw = await resp.text();                // read once
    const data = contentType.includes('application/json') && raw
      ? (() => { try { return JSON.parse(raw); } catch { return null; } })()
      : null;

    if (!resp.ok) {
      const msg =
        data?.details?.status?.statusCode ||
        data?.error ||
        data?.message ||
        raw ||                             // maybe HTML/plain-text error from a proxy
        `HTTP ${resp.status}`;
      throw new Error(msg);
    }

    const redirectUri = data?.redirectUri;
    if (!redirectUri) {
      throw new Error('Brak redirectUri w odpowiedzi serwera.');
    }

    window.location.href = redirectUri;
  } catch (e) {
    console.error('Payment start error:', e);
    setErr(e?.message || 'Wystąpił błąd. Spróbuj ponownie.');
    setBusy(false);
  }
};


  return (
    <>
      <h2>Wesprzyj nas!</h2>
      <aside className="donate">
        <div className="amounts">
          {amounts.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              className={amount === v ? 'active' : undefined}
              aria-pressed={amount === v}
            >
              {v}&nbsp;zł
            </button>
          ))}
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <label className="formLabel" htmlFor="donor-name">Imię:</label>
          <input
            id="donor-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="formField"
            placeholder="Anna"
            autoComplete="name"
          />

          <label className="formLabel" htmlFor="donor-email">E-mail:</label>
          <input
            id="donor-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="formField"
            placeholder="jan@example.com"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={email && !emailValid ? 'true' : 'false'}
          />
          {email && !emailValid && (
            <p role="alert" className="formError">Podaj poprawny adres e-mail.</p>
          )}
        </form>

        <div className="agreementContainer">
          <input
            id="donate-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <label className="agreement" htmlFor="donate-consent">
            Wyrażam zgodę na przetwarzanie moich danych osobowych w celu realizacji darowizny.
            <br />Zostaniesz przekierowany/a na bezpieczną stronę płatności PayU.
          </label>
        </div>

        {err && (
          <p role="alert" className="formError" style={{ marginTop: 8 }}>
            {err}
          </p>
        )}

        <div className="buttonContainer">
          <button
            type="button"
            className="primaryBtn"
            disabled={!canPay}
            onClick={startPayment}
            aria-disabled={!canPay ? 'true' : 'false'}
          >
            {busy ? 'Przekierowywanie…' : 'Wpłać'}
          </button>
        </div>
      </aside>
    </>
  );
}
