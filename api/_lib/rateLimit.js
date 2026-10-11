const memory = new Map();

async function upstash(parts) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;

  const res = await fetch(`${url}/${parts.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  const data = await res.json();
  return data.result;
}

let warnedNoUpstash = false;

export async function isLimited(key, { max = 5, windowSec = 60 } = {}) {
  try {
    // Klucz dostaje TTL zanim zostanie zwiekszony, wiec nawet przy bledzie
    // drugiego wywolania nie zostanie zablokowany na zawsze.
    const created = await upstash(['SET', key, '0', 'EX', String(windowSec), 'NX']);
    if (created !== undefined) {
      const hits = await upstash(['INCR', key]);
      return Number(hits) > max;
    }
    if (!warnedNoUpstash) {
      warnedNoUpstash = true;
      console.warn(JSON.stringify({ level: 'warn', msg: 'ratelimit.memory_fallback' }));
    }
  } catch (err) {
    void err;
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
