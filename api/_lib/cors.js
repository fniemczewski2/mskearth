import { ALLOWED_ORIGINS } from './config.js';
import { log } from './log.js';
import { msg } from './messages.js';

/**
 * Ustawia naglowki CORS i odrzuca zadania z obcych zrodel.
 * Zwraca true, gdy odpowiedz zostala juz wyslana (preflight, 403, 405).
 */
export function applyCors(req, res, { methods = ['POST'] } = {}) {
  const origin = req.headers.origin;
  const allowed = Boolean(origin) && ALLOWED_ORIGINS.has(origin);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(allowed ? 204 : 403).end();
    return true;
  }

  if (!methods.includes(req.method)) {
    res.setHeader('Allow', [...methods, 'OPTIONS'].join(', '));
    res.status(405).json({ code: 'method', error: msg(req, 'method') });
    return true;
  }

  // Przegladarka dolacza Origin do kazdego POST; brak naglowka oznacza klienta spoza przegladarki.
  const originRequired = req.method !== 'GET';
  if ((origin && !allowed) || (originRequired && !origin)) {
    log.security('origin_rejected', req, { origin: origin ?? null });
    res.status(403).json({ code: 'origin', error: msg(req, 'origin') });
    return true;
  }
  return false;
}
