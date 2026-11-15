import Stripe from 'stripe';

import { STRIPE_TIMEOUT_MS } from './config.js';

const STRIPE_API_VERSION = '2025-08-27.basil';

let client;

/** Klient tworzony przy pierwszym uzyciu: brak klucza daje czytelny blad w handlerze, a nie przy imporcie. */
export function getStripe() {
  if (client) return client;
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error('Brak STRIPE_SECRET_KEY w zmiennych srodowiskowych.');
    err.code = 'stripe_config';
    throw err;
  }
  client = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    timeout: STRIPE_TIMEOUT_MS,
  });
  return client;
}

export const DONATION_RECIPIENT = 'Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego';
