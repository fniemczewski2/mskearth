const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Zwraca adres nadajacy sie do atrybutu href albo undefined.
 * Odrzuca schematy wykonywalne (javascript:, data:) w adresach pochodzacych z bazy.
 */
export function safeHref(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
