export function redact(value) {
  if (!value) return null;
  const s = String(value);
  const at = s.indexOf('@');
  if (at > 0) return `${s.slice(0, 2)}***@${s.slice(at + 1)}`;
  return `${s.slice(0, 2)}***`;
}

function emit(level, msg, extra) {
  const line = { level, msg, ts: new Date().toISOString(), ...extra };
  if (level === 'error') console.error(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

export const log = {
  info: (msg, meta = {}) => emit('info', msg, meta),
  warn: (msg, meta = {}) => emit('warn', msg, meta),
  error: (msg, err, meta = {}) =>
    emit('error', msg, { err: err?.message ?? String(err), code: err?.code, ...meta }),
};
