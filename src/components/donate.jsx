import { useMemo, useState } from "react";

export default function DonateStripe() {
  const amounts = useMemo(() => [10, 20, 50], [])
  const [amount, setAmount] = useState(amounts[1]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canPay = Boolean(amount > 0 && consent && emailValid && !busy);

  async function startPayment() {
    if (!canPay) return;

    setBusy(true);
    setErr("");

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount, // w złotych (serwer konwertuje na grosze)
          name: name || "",
          email: email || "",
          locale: (typeof navigator !== "undefined" && navigator.language) ? navigator.language : "pl",
          provider: "stripe",
        }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        throw new Error("Nieprawidłowa odpowiedź serwera.");
      }

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Nie udało się utworzyć płatności.");
      }

      // Przekierowanie do Stripe Checkout
      window.location.href = data.url;
    } catch (e) {
      setErr(e?.message || "Wystąpił błąd po stronie serwera.");
      setBusy(false);
    }
  }

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
              className={amount === v ? "active" : undefined}
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
            aria-invalid={email && !emailValid ? "true" : "false"}
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
            <br />Zostaniesz przekierowany/a na bezpieczną stronę płatności Stripe.
          </label>
        </div>

        {err && <p role="alert" className="formError">{err}</p>}

        <div className="buttonContainer">
          <button
            type="button"
            className="primaryBtn"
            disabled={!canPay}
            onClick={startPayment}
            aria-disabled={!canPay ? "true" : "false"}
          >
            {busy ? "Przekierowywanie…" : "Wpłać"}
          </button>
        </div>
      </aside>
    </>
  );
}
