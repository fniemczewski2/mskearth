import { z } from 'zod';

import { applyCors } from './_lib/cors.js';
import { recordCheckoutSession } from './_lib/donations.js';
import { log } from './_lib/log.js';
import { msg } from './_lib/messages.js';
import { rejectIfLimited } from './_lib/rateLimit.js';
import { CHECKOUT_SESSION_RE, getStripe } from './_lib/stripe.js';

const BodySchema = z.object({ sessionId: z.string().trim().regex(CHECKOUT_SESSION_RE) });

/**
 * Potwierdzenie wplaty po powrocie ze Stripe Checkout (zastepuje webhook).
 * Strona podziekowania przesyla identyfikator sesji, a serwer pobiera jej stan ze Stripe
 * i zapisuje go w tabeli donations. Przegladarka nie przekazuje kwoty ani statusu.
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (await rejectIfLimited(req, res, 'confirm')) return;

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ code: 'stripe_config', error: msg(req, 'stripeNotConfigured') });
  }

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ code: 'invalid', error: msg(req, 'portalInvalid') });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);
    if (session.status !== 'complete') {
      return res.status(200).json({ status: 'pending' });
    }
    const status = await recordCheckoutSession(session);
    log.info('checkout.confirmed', { session_id: session.id, status });
    return res.status(200).json({ status });
  } catch (err) {
    log.error('checkout.confirm', err, { type: err?.type ?? err?.name });
    return res.status(502).json({ code: 'server', error: msg(req, 'unavailable') });
  }
}
