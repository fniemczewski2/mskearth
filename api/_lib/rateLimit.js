import { MEMORY_LIMIT_MAX_KEYS, RATE_LIMITS, UPSTASH_TIMEOUT_MS } from './config.js';
import { clientIpOf, log } from './log.js';
import { msg } from './messages.js';

const memory = new Map();

async function upstash(parts) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;

  const res = await fetch(`${url}/${parts.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  const data = await res.json();
  return data.result;
}

let warnedNoUpstash = false;

export async function isLimited(key, { max = 5, windowSec = 60 } = {}) {
  try {
    // Klucz dostaje TTL przed zwiekszeniem licznika, wiec blad drugiego wywolania nie blokuje go na stale.
    const created = await upstash(['SET', key, '0', 'EX', String(windowSec), 'NX']);
    if (created !== undefined) {
      const hits = await upstash(['INCR', key]);
      return Number(hits) > max;
    }
    if (!warnedNoUpstash) {
      warnedNoUpstash = true;
      // Bez Upstash limit obejmuje tylko jedna instancje funkcji.
      log.error('ratelimit.memory_fallback', new Error('Brak UPSTASH_REDIS_REST_URL/TOKEN'));
    }
  } catch (err) {
    log.error('ratelimit.upstash_error', err);
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > MEMORY_LIMIT_MAX_KEYS) {
      for (const [k, v] of memory) if (now > v.resetAt) memory.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export const clientIp = clientIpOf;

/** Sprawdza limit z RATE_LIMITS[name]; przy przekroczeniu odpowiada 429 i zwraca true. */
export async function rejectIfLimited(req, res, name) {
  const limit = RATE_LIMITS[name];
  if (!(await isLimited(`${name}:${clientIp(req)}`, limit))) return false;
  log.security('rate_limited', req, { limit: name });
  res.setHeader('Retry-After', String(limit.windowSec));
  res.status(429).json({ code: 'rate_limited', error: msg(req, 'rateLimited') });
  return true;
}
