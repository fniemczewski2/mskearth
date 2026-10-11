import crypto from 'node:crypto';
import { z } from 'zod';

import { applyCors } from './_lib/cors.js';
import { log, redact } from './_lib/log.js';
import { buildReturnUrls } from './_lib/urls.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { isLimited, clientIp } from './_lib/rateLimit.js';
import { stripe, DONATION_RECIPIENT } from './_lib/stripe.js';

const CheckoutSchema = z.object({
  amount: z.coerce.number().min(5).max(50_000),
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().max(120).optional().default(''),
  // z.coerce.boolean() zamienia napis "false" na true, wiec przyjmujemy tylko prawdziwe wartosci logiczne.
  newsletter: z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .optional()
    .default(false),
  locale: z.enum(['pl', 'en']).optional().default('pl'),
  payment_type: z.enum(['onetime', 'recurring']).optional().default('onetime'),
  returnHost: z.string().trim().max(64).optional(),
  attemptId: z.string().trim().min(8).max(64).optional(),
});

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = clientIp(req);
  if (await isLimited(`checkout:${ip}`, { max: 5, windowSec: 60 })) {
    log.warn('checkout.rate_limited', { ip });
    return res.status(429).json({ error: 'Zbyt wiele prób. Spróbuj za chwilę.' });
  }

  const parsed = CheckoutSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane formularza.' });
  }
  const { amount, email, name, newsletter, locale, payment_type, returnHost, attemptId } = parsed.data;

  const unitAmount = Math.round(amount * 100);
  // Zapisujemy dokladnie to, co pobiera Stripe (np. 12.345 -> 12.35).
  const chargedAmount = unitAmount / 100;
  const { success: successUrl, cancel: cancelUrl } = buildReturnUrls({
    host: returnHost,
    lang: locale,
  });

  const metadata = {
    donor_name: name,
    donor_email: email,
    newsletter: newsletter ? 'true' : 'false',
    amount: String(chargedAmount),
    source: 'mskearth',
    payment_type,
  };

  // Klucz obejmuje wszystkie parametry zapytania, wiec zmiana jezyka czy imienia
  // nie konczy sie bledem Stripe "idempotency key reused with different parameters".
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(
      JSON.stringify([
        attemptId ?? Math.floor(Date.now() / 60_000),
        email,
        unitAmount,
        payment_type,
        name,
        newsletter,
        locale,
        successUrl,
      ])
    )
    .digest('hex');

  try {
    const common = {
      locale,
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      customer_email: email,
      metadata,
    };

    const session =
      payment_type === 'recurring'
        ? await stripe.checkout.sessions.create(
            {
              ...common,
              mode: 'subscription',
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
              line_items: [
                {
                  price_data: {
                    currency: 'pln',
                    product_data: {
                      name: `Darowizna na cele statutowe: ${DONATION_RECIPIENT}`,
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

    // Wiersz "pending" jest pomocniczy. Jesli zapis sie nie uda, webhook utworzy wiersz
    // na podstawie metadanych sesji, wiec darowizna nie zginie.
    const { error: dbError } = await supabaseAdmin.from('donations').insert({
      amount: chargedAmount,
      currency: 'PLN',
      donor_name: name || null,
      donor_email: email,
      status: 'pending',
      stripe_session_id: session.id,
      newsletter,
      payment_type,
    });

    if (dbError && dbError.code !== '23505') {
      log.error('donations.insert', dbError, { session_id: session.id });
    }

    log.info('checkout.created', {
      session_id: session.id,
      payment_type,
      amount: chargedAmount,
      email: redact(email),
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    log.error('checkout.create', err, { email: redact(email) });
    return res.status(500).json({ error: 'Nie udało się rozpocząć płatności. Spróbuj ponownie.' });
  }
}
