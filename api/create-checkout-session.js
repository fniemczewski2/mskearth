import crypto from 'node:crypto';
import Stripe from 'stripe';
import { z } from 'zod';

import { applyCors } from './_lib/cors.js';
import { log, redact } from './_lib/log.js';
import { buildReturnUrls } from './_lib/urls.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { isLimited, clientIp } from './_lib/rateLimit.js';

export const STRIPE_API_VERSION = '2025-08-27.basil';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  maxNetworkRetries: 2,
  timeout: 15_000,
});

const CheckoutSchema = z.object({
  amount: z.coerce.number().min(5).max(50_000),
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().max(120).optional().default(''),
  newsletter: z.coerce.boolean().optional().default(false),
  locale: z.enum(['pl', 'en']).optional().default('pl'),
  payment_type: z.enum(['onetime', 'recurring']).optional().default('onetime'),
  returnHost: z.string().trim().max(64).optional(),
});

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = CheckoutSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidlowe dane formularza.' });
  }
  const { amount, email, name, newsletter, locale, payment_type, returnHost } = parsed.data;

  const ip = clientIp(req);
  if (await isLimited(`checkout:${ip}`, { max: 5, windowSec: 60 })) {
    log.warn('checkout.rate_limited', { ip });
    return res.status(429).json({ error: 'Zbyt wiele prob. Sprobuj za chwile.' });
  }

  const unitAmount = Math.round(amount * 100);
  const { success: successUrl, cancel: cancelUrl } = buildReturnUrls({
    host: returnHost,
    lang: locale,
  });

  const metadata = {
    donor_name: name,
    donor_email: email,
    newsletter: newsletter ? 'true' : 'false',
    amount: String(amount),
    source: 'mskearth',
    payment_type,
  };

  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${email}:${unitAmount}:${payment_type}:${Math.floor(Date.now() / 60_000)}`)
    .digest('hex');

  try {
    const common = {
      locale,
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      metadata,
    };

    const session =
      payment_type === 'recurring'
        ? await stripe.checkout.sessions.create(
            {
              ...common,
              mode: 'subscription',
              customer_email: email,
              line_items: [
                {
                  price_data: {
                    currency: 'pln',
                    product: process.env.STRIPE_RECURRING_PRODUCT_ID,
                    unit_amount: unitAmount,
                    recurring: { interval: 'month' },
                  },
                  quantity: 1,
                },
              ],
              subscription_data: { metadata },
            },
            { idempotencyKey }
          )
        : await stripe.checkout.sessions.create(
            {
              ...common,
              mode: 'payment',
              customer_email: email,
              line_items: [
                {
                  price_data: {
                    currency: 'pln',
                    product_data: {
                      name: 'Darowizna na cele statutowe MSK',
                      description: name ? `Darowizna od ${name}` : 'Darowizna',
                    },
                    unit_amount: unitAmount,
                  },
                  quantity: 1,
                },
              ],
              payment_intent_data: { metadata },
            },
            { idempotencyKey }
          );

    const { error: dbError } = await supabaseAdmin.from('donations').insert({
      amount,
      currency: 'PLN',
      donor_name: name || null,
      donor_email: email,
      status: 'pending',
      stripe_session_id: session.id,
      newsletter,
      payment_type,
    });

    if (dbError) {
      log.error('donations.insert', dbError, { session_id: session.id });
    }

    log.info('checkout.created', {
      session_id: session.id,
      payment_type,
      amount,
      email: redact(email),
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    log.error('checkout.create', err, { email: redact(email) });
    return res.status(500).json({ error: 'Nie udalo sie rozpoczac platnosci. Sprobuj ponownie.' });
  }
}
