import { DEFAULT_LANG, LANGS, RETURN_HOSTS, SITE_HOST } from './config.js';

export function buildReturnUrls({ host, lang } = {}) {
  const safeHost = RETURN_HOSTS.has(host) ? host : SITE_HOST;
  const safeLang = LANGS.includes(lang) ? lang : DEFAULT_LANG;

  return {
    success: `https://${safeHost}/${safeLang}/dziekujemy?session_id={CHECKOUT_SESSION_ID}`,
    cancel: `https://${safeHost}/${safeLang}/wesprzyj`,
  };
}
