import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const LOCALE_CACHE = new Map();

export default function DonateStripe() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split("/")[1] || "pl", [location.pathname]);

  const [t, setT] = useState({ donate: {} });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (LOCALE_CACHE.has(language)) {
          if (active) setT(LOCALE_CACHE.get(language));
        } else {
          const res = await fetch(`/locales/${language}.json`, { credentials: "same-origin" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          LOCALE_CACHE.set(language, data);
          if (active) setT(data);
        }
      } catch (e) {
        console.error("DonateStripe i18n error:", e);
        if (active) setT({ donate: {} });
      }
    })();
    return () => {
      active = false;
    };
  }, [language]);

  const amounts = useMemo(() => [10, 20, 50], []);
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
          amount,
          name: name || "",
          email: email || "",
          locale: navigator.language || language || "pl",
          provider: "stripe",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || t.donate?.createPaymentFailed || "Nie udało się utworzyć płatności.");
      }

      window.location = data.url;
    } catch (e) {
      setErr(e.message || t.donate?.serverError || "Wystąpił błąd po stronie serwera.");
      setBusy(false);
    }
  }

  const currencySuffix = t.donate?.currencySuffix || "zł";

  return (
    <>
      <h2>{t.donate?.h2 || "Wesprzyj nas!"}</h2>
      <aside className="donate">
        <div className="amounts" role="group" aria-label={t.donate?.amountsAria || "Wybierz kwotę darowizny"}>
          {amounts.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              className={amount === v ? "active" : undefined}
              aria-pressed={amount === v}
            >
              {v}{"\u00A0"}{currencySuffix}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <label className="formLabel" htmlFor="donor-name">{t.donate?.nameLabel || "Imię:"}</label>
          <input
            id="donor-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="formField"
            placeholder={t.donate?.namePlaceholder || "Anna"}
            autoComplete="name"
          />

          <label className="formLabel" htmlFor="donor-email">{t.donate?.emailLabel || "E-mail:"}</label>
          <input
            id="donor-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="formField"
            placeholder={t.donate?.emailPlaceholder || "jan@example.com"}
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={email && !emailValid ? "true" : "false"}
            aria-describedby={email && !emailValid ? "donor-email-error" : undefined}
          />
          {email && !emailValid && (
            <p id="donor-email-error" role="alert" className="formError">
              {t.donate?.invalidEmail || "Podaj poprawny adres e-mail."}
            </p>
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
            {t.donate?.consent || "Wyrażam zgodę na przetwarzanie moich danych osobowych w celu realizacji darowizny."}
            <br />
            {t.donate?.redirectNote || "Zostaniesz przekierowany/a na bezpieczną stronę płatności Stripe."}
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
            aria-disabled={!canPay ? "true" : "false"}
            aria-busy={busy ? "true" : "false"}
          >
            {busy ? (t.donate?.redirecting || "Przekierowywanie…") : (t.donate?.payCta || "Wpłać")}
          </button>
        </div>
      </aside>
    </>
  );
}
