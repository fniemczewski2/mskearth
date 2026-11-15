import { z } from 'zod';

import { LANGS } from '../src/shared/config/site.js';
import { applyCors } from './_lib/cors.js';
import { log } from './_lib/log.js';
import { msg } from './_lib/messages.js';
import { rejectIfLimited } from './_lib/rateLimit.js';
import { CHECKOUT_SESSION_RE, MANAGE_LINK_TTL_SECONDS, getStripe } from './_lib/stripe.js';
import { buildPortalReturnUrl } from './_lib/urls.js';

const BodySchema = z.object({
  sessionId: z.string().trim().regex(CHECKOUT_SESSION_RE),
  locale: z.enum(LANGS).optional().default('pl'),
  returnHost: z.string().trim().max(64).optional(),
});

/**
 * Link do portalu klienta Stripe na podstawie identyfikatora sesji Checkout z potwierdzenia wplaty.
 * Serwer sprawdza w Stripe, czy sesja jest zakonczona subskrypcja. Link dziala przez
 * MANAGE_LINK_TTL_SECONDS od utworzenia sesji, zeby stary adres nie dawal dostepu do subskrypcji.
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (await rejectIfLimited(req, res, 'portal')) return;

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ code: 'stripe_config', error: msg(req, 'stripeNotConfigured') });
  }

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ code: 'invalid', error: msg(req, 'portalInvalid') });
  }
  const { sessionId, locale, returnHost } = parsed.data;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== 'subscription' || session.status !== 'complete' || !session.customer) {
      return res.status(400).json({ code: 'not_recurring', error: msg(req, 'portalNotRecurring') });
    }

    const ageSeconds = Date.now() / 1000 - session.created;
    if (ageSeconds > MANAGE_LINK_TTL_SECONDS) {
      return res.status(410).json({ code: 'expired', expired: true, error: msg(req, 'portalExpired') });
    }

    const customer = typeof session.customer === 'string' ? session.customer : session.customer.id;
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined;

    const portal = await stripe.billingPortal.sessions.create({
      customer,
      locale,
      return_url: buildPortalReturnUrl({ host: returnHost, lang: locale }),
      ...(configuration ? { configuration } : {}),
    });

    return res.status(200).json({ url: portal.url });
  } catch (err) {
    log.error('portal.create', err, { type: err?.type ?? err?.name });
    return res.status(502).json({ code: 'server', error: msg(req, 'portalFailed') });
  }
}
