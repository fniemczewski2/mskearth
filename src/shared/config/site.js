/**
 * Stale wspolne dla przegladarki, funkcji serverless (api/) i skryptow builda.
 * Plik nie moze importowac niczego zaleznego od srodowiska (window, process).
 */
export const SITE_HOST = 'msk.earth';
export const SITE_URL = `https://${SITE_HOST}`;
export const PARTNER_HOSTS = ['fpmsk.org.pl'];

export const LANGS = ['pl', 'en'];
export const DEFAULT_LANG = 'pl';
export const OG_LOCALE = { pl: 'pl_PL', en: 'en_GB' };
export const INTL_LOCALE = { pl: 'pl-PL', en: 'en-GB' };

export const DEFAULT_OG_IMAGE = '/og-image.png';
export const ORG_NAME = 'Młodzieżowy Strajk Klimatyczny';
export const FOUNDATION_NAME = 'Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego';
export const CONTACT_EMAIL = 'biuro@fpmsk.org.pl';
export const PRIVACY_POLICY_PATH = '/polityka-prywatnosci.pdf';

export const STORAGE_BUCKET = 'mskearth';

export const PUBLIC_PATHS = ['', '/aktualnosci', '/o-nas', '/miasta', '/fundacja', '/kontakt', '/wesprzyj'];

export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/msk.polska',
  instagram: 'https://www.instagram.com/mlodziezowystrajkklimatyczny',
  tiktok: 'https://www.tiktok.com/@msklimatyczny',
  x: 'https://x.com/msklimatyczny',
  youtube: 'https://www.youtube.com/@ModziezowyStrajkKlimatyczny',
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;
export const NAME_MAX_LENGTH = 120;

export const DONATION = {
  min: 5,
  max: 50_000,
  defaultAmount: 130,
  presets: [20, 50, 100],
  barPresets: [30, 50, 100],
  barDefaultAmount: 50,
  fallbackGoal: 10_000,
  statsPollMs: 60_000,
};

export const CONTACT_LIMITS = { subject: 150, message: 5000 };

export const REQUEST_TIMEOUT_MS = 15_000;
export const NEWS_PAGE_SIZE = 12;
export const ADMIN_PAGE_SIZE = 25;
export const QUERY_STALE_MS = 60_000;
