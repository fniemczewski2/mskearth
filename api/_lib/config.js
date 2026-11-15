import { DEFAULT_LANG, LANGS, PARTNER_HOSTS, SITE_HOST } from '../../src/shared/config/site.js';

export { DEFAULT_LANG, LANGS, SITE_HOST };

const withWww = (host) => [host, `www.${host}`];

export const RETURN_HOSTS = new Set([SITE_HOST, ...PARTNER_HOSTS].flatMap(withWww));

export const ALLOWED_ORIGINS = new Set([
  ...[...RETURN_HOSTS].map((host) => `https://${host}`),
  'https://sites.google.com',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000'] : []),
]);

/** Limity zapytan: max prob w oknie windowSec sekund, liczone na adres IP. */
export const RATE_LIMITS = {
  checkout: { max: 5, windowSec: 60 },
  newsletter: { max: 3, windowSec: 3600 },
  survey: { max: 10, windowSec: 3600 },
  contact: { max: 5, windowSec: 3600 },
};

export const UPSTREAM_TIMEOUT_MS = 10_000;
export const UPSTASH_TIMEOUT_MS = 2000;
export const STRIPE_TIMEOUT_MS = 15_000;
export const MEMORY_LIMIT_MAX_KEYS = 5000;

// Zmien wersje, gdy zmieni sie tresc zgody/klauzuli na stronie ankiety.
export const SURVEY_CONSENT_VERSION = 'survey-2026-10';
