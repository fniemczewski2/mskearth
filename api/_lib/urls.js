import { DEFAULT_LANG, LANGS, RETURN_HOSTS, SITE_HOST } from './config.js';

function base({ host, lang } = {}) {
  const safeHost = RETURN_HOSTS.has(host) ? host : SITE_HOST;
  const safeLang = LANGS.includes(lang) ? lang : DEFAULT_LANG;
  return `https://${safeHost}/${safeLang}`;
}

/** Adresy powrotu ze Stripe Checkout. Wplata cykliczna dostaje znacznik, po ktorym strona pokazuje zarzadzanie. */
export function buildReturnUrls({ host, lang, recurring = false } = {}) {
  const root = base({ host, lang });
  return {
    success: `${root}/dziekujemy?session_id={CHECKOUT_SESSION_ID}${recurring ? '&typ=cykliczna' : ''}`,
    cancel: `${root}/wesprzyj`,
  };
}

export function buildPortalReturnUrl({ host, lang } = {}) {
  return `${base({ host, lang })}/subskrypcja`;
}
