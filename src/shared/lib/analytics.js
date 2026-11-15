import { ANALYTICS_ID, getConsent, onConsentChange } from './consent.js';

const GTAG_URL = 'https://www.googletagmanager.com/gtag/js';

let loaded = false;

function gtag() {
  // gtag.js wymaga obiektu arguments, a nie tablicy.
  window.dataLayer.push(arguments);
}

function removeAnalyticsCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (!/^_ga/.test(name)) continue;
    for (const domain of ['', `; domain=${location.hostname}`, `; domain=.${location.hostname}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

function apply(consent) {
  const id = ANALYTICS_ID;
  if (!id) return;
  const granted = Boolean(consent?.analytics);
  window[`ga-disable-${id}`] = !granted;

  if (!granted) {
    if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' });
    removeAnalyticsCookies();
    return;
  }
  if (loaded) {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    return;
  }

  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('js', new Date());
  gtag('config', id, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `${GTAG_URL}?id=${encodeURIComponent(id)}`;
  document.head.append(script);
  trackPageView();
}

/** Google Analytics 4 laduje sie dopiero po zgodzie i tylko gdy ustawiono VITE_GA_MEASUREMENT_ID. */
export function initAnalytics() {
  apply(getConsent());
  return onConsentChange((consent) => {
    if (consent) apply(consent);
  });
}

export function analyticsConfigured() {
  return Boolean(ANALYTICS_ID);
}

export function trackPageView(path = `${location.pathname}${location.search}`) {
  if (!loaded || !getConsent()?.analytics) return;
  gtag('event', 'page_view', { page_path: path, page_location: location.href, page_title: document.title });
}
