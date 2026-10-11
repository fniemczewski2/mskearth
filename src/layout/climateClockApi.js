const API_URL = 'https://api.climateclock.world/v2/widget/clock.json';

let pending = null;

/** Jedno zapytanie na zaladowanie strony, wspolne dla zegara i paska wiadomosci. */
export function fetchClimateClock() {
  if (!pending) {
    pending = (async () => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const res = await fetch(API_URL, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return data?.data?.modules ?? null;
        } catch (err) {
          lastErr = err;
          await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
        }
      }
      pending = null;
      throw lastErr;
    })();
  }
  return pending;
}
