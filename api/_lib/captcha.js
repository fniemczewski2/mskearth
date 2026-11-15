import { UPSTREAM_TIMEOUT_MS } from './config.js';
import { clientIpOf, log } from './log.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TOKEN_MAX_LENGTH = 2048;

let warnedNoSecret = false;

/**
 * Sprawdza token Cloudflare Turnstile przyslany przez formularz.
 * Zwraca true dla poprawnego tokenu. Bez TURNSTILE_SECRET_KEY captcha jest wylaczona
 * (blad w logach), zeby brak konfiguracji nie blokowal formularzy.
 */
export async function verifyCaptcha(token, req) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!warnedNoSecret) {
      warnedNoSecret = true;
      log.error('captcha.missing_secret', new Error('Brak TURNSTILE_SECRET_KEY: captcha wylaczona'));
    }
    return true;
  }

  if (typeof token !== 'string' || !token || token.length > TOKEN_MAX_LENGTH) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    const ip = clientIpOf(req);
    if (ip !== 'unknown') body.set('remoteip', ip);

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Turnstile HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) log.warn('captcha.rejected', { codes: data['error-codes'] ?? [] });
    return data.success === true;
  } catch (err) {
    // Awaria uslugi Cloudflare nie moze zablokowac darowizn i zapisow; limit zapytan nadal dziala.
    log.error('captcha.verify', err);
    return true;
  }
}
