import Stripe from 'stripe';

export const STRIPE_API_VERSION = '2025-08-27.basil';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  maxNetworkRetries: 2,
  timeout: 15_000,
});

export const DONATION_RECIPIENT = 'Fundacja Przyjaciół Młodzieżowego Strajku Klimatycznego';
