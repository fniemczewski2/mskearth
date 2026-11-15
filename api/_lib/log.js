import crypto from 'node:crypto';

export function redact(value) {
  if (!value) return null;
  const s = String(value);
  const at = s.indexOf('@');
  if (at > 0) return `${s.slice(0, 2)}***@${s.slice(at + 1)}`;
  return `${s.slice(0, 2)}***`;
}

/** Skrot adresu IP z dobowa sola: pozwala laczyc zdarzenia z jednego dnia bez zapisywania adresu. */
export function hashIp(ip) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${day}:${ip}`).digest('hex').slice(0, 12);
}

function emit(level, msg, extra) {
  const line = { level, msg, ts: new Date().toISOString(), ...extra };
  if (level === 'error') console.error(JSON.stringify(line));
  else if (level === 'warn') console.warn(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

export const log = {
  info: (msg, meta = {}) => emit('info', msg, meta),
  warn: (msg, meta = {}) => emit('warn', msg, meta),
  error: (msg, err, meta = {}) =>
    emit('error', msg, { err: err?.message ?? String(err), code: err?.code, ...meta }),
  /** Zdarzenia bezpieczenstwa (limit, honeypot, obce zrodlo, captcha) w jednym formacie. */
  security: (event, req, meta = {}) =>
    emit('warn', `security.${event}`, {
      ip: hashIp(clientIpOf(req)),
      path: req?.url ?? null,
      ua: String(req?.headers?.['user-agent'] ?? '').slice(0, 120),
      ...meta,
    }),
};

export function clientIpOf(req) {
  const h = req?.headers ?? {};
  // Na Vercelu x-real-ip i x-vercel-forwarded-for ustawia platforma; x-forwarded-for moze dopisac klient.
  return (
    h['x-real-ip'] ??
    h['x-vercel-forwarded-for']?.split(',')[0]?.trim() ??
    h['x-forwarded-for']?.split(',').at(-1)?.trim() ??
    'unknown'
  );
}
