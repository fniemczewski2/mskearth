const API_URL = 'https://api.climateclock.world/v2/widget/clock.json';

const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 1000;
const TIMEOUT_MS = 8000;

let pending = null;

/** Jedno zapytanie na zaladowanie strony, wspolne dla zegara i paska wiadomosci. */
export function fetchClimateClock() {
  if (!pending) {
    pending = (async () => {
      let lastErr;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
          const res = await fetch(API_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return data?.data?.modules ?? null;
        } catch (err) {
          lastErr = err;
          // Przerwa tylko przed kolejna proba, nie po ostatniej.
          if (attempt < MAX_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, 2 ** attempt * RETRY_BASE_MS));
          }
        }
      }
      pending = null;
      throw lastErr;
    })();
  }
  return pending;
}
