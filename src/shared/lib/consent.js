const STORAGE_KEY = 'msk-cookie-consent';
const CONSENT_VERSION = 3;
const EVENT = 'msk:consent';

/** Identyfikator Google Analytics 4; pusty oznacza, ze analityka jest wylaczona. */
export const ANALYTICS_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || undefined;

/** Zwraca { analytics: boolean } albo null, gdy uzytkownik jeszcze nie wybral. */
export function getConsent() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!stored) return null;
    // Starsze potwierdzenia dotyczyly samej informacji; o zgode na analityke trzeba zapytac ponownie.
    return stored.version === CONSENT_VERSION || !ANALYTICS_ID ? stored : null;
  } catch {
    return null;
  }
}

export function setConsent(analytics) {
  const value = { analytics: Boolean(analytics), ts: new Date().toISOString(), version: CONSENT_VERSION };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Tryb prywatny bez localStorage: wybor obowiazuje do zamkniecia karty.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

/** Otwiera ponownie baner, np. z linku "Ustawienia cookies" w stopce. */
export function reopenConsent() {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: null }));
}

export function onConsentChange(listener) {
  const handler = (e) => listener(e.detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
