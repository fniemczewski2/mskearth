/**
 * Adresy powrotu z Stripe Checkout buduje SERWER.
 * Przyjmowanie success_url/cancel_url z ciala zadania pozwalaloby
 * wygenerowac prawdziwy link platniczy Fundacji, ktory po zaplacie
 * przekierowuje ofiare na strone atakujacego (open redirect / phishing).
 */

const RETURN_HOSTS = new Set([
  'msk.earth',
  'www.msk.earth',
  'fpmsk.org.pl',
  'www.fpmsk.org.pl',
]);

const LANGS = new Set(['pl', 'en']);

export function buildReturnUrls({ host, lang } = {}) {
  const safeHost = RETURN_HOSTS.has(host) ? host : 'www.msk.earth';
  const safeLang = LANGS.has(lang) ? lang : 'pl';

  return {
    success: `https://${safeHost}/${safeLang}/dziekujemy?session_id={CHECKOUT_SESSION_ID}`,
    cancel: `https://${safeHost}/${safeLang}/wesprzyj`,
  };
}
