/**
 * Limiter zapytan.
 *
 * Jesli ustawiono UPSTASH_REDIS_REST_URL i UPSTASH_REDIS_REST_TOKEN,
 * limit jest wspoldzielony miedzy instancjami funkcji (wariant poprawny).
 * W przeciwnym razie dziala limiter in-memory: chroni przed prostym
 * zalewem z jednej instancji, ale nie przed atakiem rozproszonym.
 */

const memory = new Map();

async function upstash(parts) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}/${parts.join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result;
}

/**
 * @returns {Promise<boolean>} true = limit przekroczony
 */
export async function isLimited(key, { max = 5, windowSec = 60 } = {}) {
  const safeKey = encodeURIComponent(key);

  try {
    const hits = await upstash(['INCR', safeKey]);
    if (hits !== null) {
      if (hits === 1) await upstash(['EXPIRE', safeKey, String(windowSec)]);
      return hits > max;
    }
  } catch {
    // Redis niedostepny - schodzimy do wariantu in-memory
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > 5000) {
      for (const [k, v] of memory) if (now > v.resetAt) memory.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown';
}
