import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useDonationStats } from "../services/db/donationStats"; // Import the custom hook
import "../style/donate.css"

const LOCALE_CACHE = new Map();

export default function DonateStripe() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split("/")[1] || "pl", [location.pathname]);

  const [t, setT] = useState({ donate: {} });
  
  // Use custom hook for donation stats - automatically fetches and updates in real-time
  const { goalAmount, currentAmount, donorsCount, loading } = useDonationStats();

  // Translation loading
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (LOCALE_CACHE.has(language)) {
          if (active) setT(LOCALE_CACHE.get(language));
        } else {
          const res = await fetch(`/locales/${language}.json`, { credentials: "same-origin" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          let data;
          try {
            const text = await res.text();
            data = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            throw new Error(t.donate?.createPaymentFailed || "Nie udało się utworzyć płatności.");
          }
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

  const amounts = useMemo(() => [{amount: 70, desc: "godzina warsztatu dla\u00A01\u00A0klasy"}, {amount: 130, desc: "dzień warsztatów dla\u00A01\u00A0szkoły"}, {amount: 200, desc: "szkolenie osoby prowadzącej"}]);

  const [amount, setAmount] = useState(amounts[1].amount); // Default to second amount (medium)
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  // Use custom amount if provided, otherwise use selected amount
  const finalAmount = showCustom && customAmount ? parseFloat(customAmount) : amount;
  const canPay = Boolean(finalAmount > 0 && consent && emailValid && !busy);

  // Calculate progress percentage
  const progressPercentage = Math.min((currentAmount / goalAmount) * 100, 100);

  async function startPayment() {
    if (!canPay) return;

    setBusy(true);
    setErr("");

    try {
      // Create Stripe checkout session
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
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

      // Save pending donation to Supabase
      // (Will be updated to 'completed' via webhook after successful payment)
      const { error: insertError } = await supabase
        .from('donations')
        .insert({
          amount: finalAmount,
          donor_name: name || 'Anonymous',
          donor_email: email,
          status: 'pending',
          stripe_session_id: data.sessionId, // Store session ID for webhook
          currency: 'PLN',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving donation to database:', insertError);
        // Continue anyway - webhook will handle it
      }

      // Redirect to Stripe
      window.location = data.url;
    } catch (e) {
      setErr(e.message || t.donate?.serverError || "Wystąpił błąd po stronie serwera.");
      setBusy(false);
    }
  }

  const currencySuffix = t.donate?.currencySuffix || "zł";
  
  // Format numbers with spaces for thousands
  const formatAmount = (num) => {
    return new Intl.NumberFormat('pl-PL').format(Math.round(num));
  };

  return (
    <>
      <h2>{t.donate?.h2 || "Wesprzyj nas!"}</h2>
      <aside className="donate">
        {/* Fundraising Goal Progress */}
        <div className="donation-progress" role="region" aria-label="Postęp zbiórki">
          {loading ? (
            <div className="progress-loading" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true"></span>
              <span className="sr-only">Ładowanie statystyk...</span>
            </div>
          ) : (
            <>
              <div className="progress-stats">
                <div className="stat-item">
                  <span className="stat-value">{formatAmount(currentAmount)} {currencySuffix}</span>
                  <span className="stat-label">{t.donate?.collected || "zebrane"}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{formatAmount(goalAmount)} {currencySuffix}</span>
                  <span className="stat-label">{t.donate?.goal || "cel"}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{donorsCount}</span>
                  <span className="stat-label">{t.donate?.donors || "darczyńców"}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div 
                className="progress-bar-container" 
                role="progressbar" 
                aria-valuenow={Math.round(progressPercentage)} 
                aria-valuemin="0" 
                aria-valuemax="100"
                aria-label={`Zebrano ${Math.round(progressPercentage)}% celu`}
              >
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progressPercentage}%` }}
                >
                  <span className="progress-percentage">{Math.round(progressPercentage)}%</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Donation Amount Selection */}
        <div className="amounts" role="group" aria-label={t.donate?.amountsAria || "Wybierz kwotę darowizny"}>
          {amounts.map((v) => (
            <button
              key={v.amount}
              type="button"
              onClick={() => {
                setAmount(v.amount);
                setShowCustom(false);
                setCustomAmount("");
              }}
              className={!showCustom && amount === v.amount ? "active" : undefined}
              aria-pressed={!showCustom && amount === v.amount}
            >
              <p className="amount">{v.amount}{"\u00A0"}{currencySuffix}</p>
              <p className="desc">{v.desc}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className={showCustom ? "active" : undefined}
            aria-pressed={showCustom}
          >
            {t.donate?.customAmount || "Inna kwota"}
          </button>
        </div>

        {/* Custom Amount Input */}
        {showCustom && (
          <div className="custom-amount-container">
            <label className="formLabel" htmlFor="custom-amount">
              {t.donate?.customAmountLabel || "Wpisz kwotę:"}
            </label>
            <div className="input-with-suffix">
              <input
                id="custom-amount"
                type="number"
                min="1"
                step="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="formField"
                placeholder="50"
                inputMode="numeric"
                aria-label="Niestandardowa kwota darowizny"
              />
              <span className="input-suffix">{currencySuffix}</span>
            </div>
          </div>
        )}

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
            required
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
            required
          />
          <label className="agreement" htmlFor="donate-consent">
            {t.donate?.consent || "Wyrażam zgodę na przetwarzanie moich danych osobowych w celu realizacji darowizny."}
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
            <p>{busy 
              ? (t.donate?.redirecting || "Przekierowywanie…") 
              : `${t.donate?.payCta || "Wpłać"} ${formatAmount(finalAmount)} ${currencySuffix}`
            }</p>
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="trust-indicators">
          <p className="trust-text">
            <i className="bi bi-shield-check" aria-hidden="true"></i>
            &nbsp;{t.donate?.secure || "Bezpieczna płatność przez Stripe"}
          </p>
          <p className="trust-text">
            <i className="bi bi-receipt" aria-hidden="true"></i>
            &nbsp;{t.donate?.receipt || "Otrzymasz potwierdzenie na email"}
          </p>
        </div>
      </aside>
    </>
  );
}
