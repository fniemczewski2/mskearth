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
  captcha: z.string().optional(),
});

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (await rejectIfLimited(req, res, 'checkout')) return;

  const stripe = getStripe();
  if (!stripe) {
    log.error('checkout.config', new Error('Brak STRIPE_SECRET_KEY'));
    return res.status(503).json({ code: 'stripe_config', error: msg(req, 'stripeNotConfigured') });
  }

  const parsed = CheckoutSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path?.[0] ?? null;
    return res.status(400).json({ code: 'invalid', field, error: msg(req, 'invalid') });
  }
  const { amount, email, name, newsletter, locale, payment_type, returnHost, captcha } = parsed.data;
  const isRecurring = payment_type === 'recurring';

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
    recurring: isRecurring,
  });

  // Metadane czyta api/checkout-confirm.js po powrocie ze Stripe: imie darczyncy, zgoda na newsletter, rodzaj wplaty.
  const metadata = {
    donor_name: name,
    donor_email: email,
    newsletter: newsletter ? 'true' : 'false',
    amount: String(chargedAmount),
    source: 'mskearth',
    payment_type,
  };

  try {
    let session;

    if (isRecurring) {
      // Subskrypcja jest przypisana do klienta Stripe, dzieki czemu darczynca moze nia zarzadzac w portalu.
      const customer = await stripe.customers.create({ email, name: name || undefined, metadata });

      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        locale,
        customer: customer.id,
        line_items: [
          {
            price_data: {
              currency: 'pln',
              unit_amount: unitAmount,
              recurring: { interval: 'month' },
              product_data: { name: `Regularna darowizna na cele statutowe: ${DONATION_RECIPIENT}` },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        subscription_data: { metadata },
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        locale,
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'pln',
              unit_amount: unitAmount,
              product_data: {
                name: `Darowizna na cele statutowe: ${DONATION_RECIPIENT}`,
                description: name ? `Darowizna od ${name}` : 'Darowizna',
              },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        payment_intent_data: { metadata },
      });
    }

    // Wiersz "pending" jest pomocniczy: wplate ksieguje api/checkout-confirm.js na podstawie danych ze Stripe.
    await recordPending({ session, chargedAmount, name, email, newsletter, payment_type });

    log.info('checkout.created', {
      session_id: session.id,
      payment_type,
      amount: chargedAmount,
      email: redact(email),
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    // Typ i kod bledu Stripe (np. StripeAuthenticationError, api_key_expired) wskazuja przyczyne w logach.
    log.error('checkout.create', err, { type: err?.type ?? err?.name, email: redact(email) });
    return res.status(500).json({ code: 'server', error: msg(req, 'checkoutFailed') });
  }
}

async function recordPending({ session, chargedAmount, name, email, newsletter, payment_type }) {
  const db = getSupabaseAdmin();
  if (!db) return;
  try {
    const { error } = await db.from('donations').insert({
      amount: chargedAmount,
      currency: 'PLN',
      donor_name: name || null,
      donor_email: email,
      status: 'pending',
      stripe_session_id: session.id,
      newsletter,
      payment_type,
    });
    if (error && error.code !== '23505') log.error('donations.insert', error, { session_id: session.id });
  } catch (err) {
    log.error('donations.insert', err, { session_id: session.id });
  }
}
