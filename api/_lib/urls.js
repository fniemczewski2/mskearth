export const CANONICAL_HOST = 'msk.earth';

const RETURN_HOSTS = new Set([
  'msk.earth',
  'www.msk.earth',
  'fpmsk.org.pl',
  'www.fpmsk.org.pl',
]);

const LANGS = new Set(['pl', 'en']);

export function buildReturnUrls({ host, lang } = {}) {
  const safeHost = RETURN_HOSTS.has(host) ? host : CANONICAL_HOST;
  const safeLang = LANGS.has(lang) ? lang : 'pl';

  return {
    success: `https://${safeHost}/${safeLang}/dziekujemy?session_id={CHECKOUT_SESSION_ID}`,
    cancel: `https://${safeHost}/${safeLang}/wesprzyj`,
  };
}
