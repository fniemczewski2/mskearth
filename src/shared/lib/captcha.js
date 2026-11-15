const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Klucz witryny Cloudflare Turnstile; pusty oznacza, ze captcha jest wylaczona. */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined;

let scriptPromise = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('Nie udalo sie wczytac Turnstile.'));
      };
      document.head.append(script);
    });
  }
  return scriptPromise;
}

/**
 * Zwraca jednorazowy token Cloudflare Turnstile do pola "captcha" w tresci zadania.
 * Widzet pojawia sie tylko wtedy, gdy Cloudflare wymaga interakcji. Bez klucza witryny
 * albo przy bledzie zwraca undefined: decyzje podejmuje wtedy serwer.
 */
export async function getCaptchaToken({ signal } = {}) {
  if (!TURNSTILE_SITE_KEY) return undefined;

  const container = document.createElement('div');
  container.className = 'captcha-widget';
  let widgetId;

  try {
    const turnstile = await loadScript();
    document.body.append(container);

    return await new Promise((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
        once: true,
      });
      widgetId = turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: 'interaction-only',
        language: document.documentElement.lang || 'auto',
        callback: resolve,
        'error-callback': (code) => reject(new Error(`Turnstile: ${code}`)),
        'timeout-callback': () => reject(new Error('Turnstile: timeout')),
      });
    });
  } catch (err) {
    if (err?.name !== 'AbortError') console.error('Captcha error:', err);
    return undefined;
  } finally {
    if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    container.remove();
  }
}
