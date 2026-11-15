import Stripe from 'stripe';

import { STRIPE_TIMEOUT_MS } from './config.js';

let client = null;

/**
 * Klient Stripe tworzony przy pierwszym uzyciu. Bez STRIPE_SECRET_KEY zwraca null,
 * a handler odpowiada 503 z czytelnym komunikatem. Wersja API: domyslna dla zainstalowanego SDK.
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (!client) {
    client = new Stripe(key, { maxNetworkRetries: 2, timeout: STRIPE_TIMEOUT_MS });
  }
  return client;
}

export const DONATION_RECIPIENT = 'Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego';

// Serwis dziala wylacznie na kluczach produkcyjnych Stripe.
export const CHECKOUT_SESSION_RE = /^cs_live_[A-Za-z0-9]{10,250}$/;
export const SUBSCRIPTION_ID_RE = /^sub_[A-Za-z0-9]{8,250}$/;

/** Jak dlugo link z potwierdzenia wplaty otwiera panel zarzadzania subskrypcja. */
export const MANAGE_LINK_TTL_SECONDS = 24 * 60 * 60;
