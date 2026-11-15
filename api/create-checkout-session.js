import crypto from 'node:crypto';
import { z } from 'zod';

import { DONATION, EMAIL_MAX_LENGTH, LANGS, NAME_MAX_LENGTH } from '../src/shared/config/site.js';
import { applyCors } from './_lib/cors.js';
import { verifyCaptcha } from './_lib/captcha.js';
import { log, redact } from './_lib/log.js';
import { msg } from './_lib/messages.js';
import { buildReturnUrls } from './_lib/urls.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { rejectIfLimited } from './_lib/rateLimit.js';
import { getStripe, DONATION_RECIPIENT } from './_lib/stripe.js';

const CheckoutSchema = z.object({
  amount: z.coerce.number().min(DONATION.min).max(DONATION.max),
  email: z.string().trim().toLowerCase().email().max(EMAIL_MAX_LENGTH),
  name: z.string().trim().max(NAME_MAX_LENGTH).optional().default(''),
  // z.coerce.boolean() zamienia napis "false" na true, dlatego akceptowane sa tylko wartosci logiczne.
  newsletter: z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .optional()
    .default(false),
  locale: z.enum(LANGS).optional().default('pl'),
  payment_type: z.enum(['onetime', 'recurring']).optional().default('onetime'),
  returnHost: z.string().trim().max(64).optional(),
  attemptId: z.string().trim().min(8).max(64).optional(),
  captcha: z.string().optional(),
});

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (await rejectIfLimited(req, res, 'checkout')) return;

  const parsed = CheckoutSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ code: 'invalid', error: msg(req, 'invalid') });
  }
  const { amount, email, name, newsletter, locale, payment_type, returnHost, attemptId, captcha } =
    parsed.data;

  if (!(await verifyCaptcha(captcha, req))) {
    log.security('captcha_failed', req, { form: 'checkout' });
    return res.status(400).json({ code: 'captcha', error: msg(req, 'captcha') });
  }

  const unitAmount = Math.round(amount * 100);
  // Kwota zapisana w bazie musi byc rowna pobranej przez Stripe (np. 12.345 -> 12.35).
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
    const stripe = getStripe();
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
                    // Stripe wymaga produktu; bez STRIPE_RECURRING_PRODUCT_ID powstaje on w locie.
                    ...(process.env.STRIPE_RECURRING_PRODUCT_ID
                      ? { product: process.env.STRIPE_RECURRING_PRODUCT_ID }
                      : {
                          product_data: {
                            name: `Regularna darowizna na cele statutowe: ${DONATION_RECIPIENT}`,
                          },
                        }),
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
    const supabaseAdmin = getSupabaseAdmin();
    const { error: dbError } = supabaseAdmin
      ? await supabaseAdmin.from('donations').insert({
          amount: chargedAmount,
          currency: 'PLN',
          donor_name: name || null,
          donor_email: email,
          status: 'pending',
          stripe_session_id: session.id,
          newsletter,
          payment_type,
        })
      : { error: null };

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
    return res.status(500).json({ code: 'server', error: msg(req, 'checkoutFailed') });
  }
}
