import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { applyCors } from './_lib/cors.js';
import { log, redact } from './_lib/log.js';
import { msg } from './_lib/messages.js';
import { rejectIfLimited } from './_lib/rateLimit.js';
import { SUBSCRIPTION_ID_RE, getStripe } from './_lib/stripe.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

export const config = { maxDuration: 30 };

const LISTED_STATUSES = ['active', 'past_due'];
const MAX_SUBSCRIPTIONS = 1000;
const CURRENCY = 'pln';
const MONTHS_PER_INTERVAL = { month: 1, year: 12 };

const CancelSchema = z.object({
  action: z.literal('cancel'),
  subscriptionId: z.string().trim().regex(SUBSCRIPTION_ID_RE),
});

/**
 * Sprawdza token sesji Supabase z naglowka Authorization i uprawnienia administratora
 * (funkcja SQL is_admin wykonana w imieniu tego uzytkownika). Zwraca uzytkownika albo null.
 */
async function requireAdmin(req) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;

  const asUser = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser(token);
  if (userError || !userData?.user) return null;

  const { data: isAdmin, error } = await asUser.rpc('is_admin');
  if (error || isAdmin !== true) return null;
  return userData.user;
}

const sumCurrency = (entries) =>
  (entries ?? []).filter((e) => e.currency === CURRENCY).reduce((sum, e) => sum + e.amount, 0) / 100;

/** Kwota subskrypcji w przeliczeniu na miesiac (grosze -> zlote). */
function monthlyAmount(subscription) {
  return (
    subscription.items.data.reduce((sum, item) => {
      const months = MONTHS_PER_INTERVAL[item.price?.recurring?.interval];
      if (!months || item.price.currency !== CURRENCY) return sum;
      const perInterval = (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
      return sum + perInterval / (months * (item.price.recurring.interval_count ?? 1));
    }, 0) / 100
  );
}

function toRow(subscription) {
  const customer = typeof subscription.customer === 'object' ? subscription.customer : null;
  return {
    id: subscription.id,
    status: subscription.status,
    email: customer?.email ?? null,
    name: customer?.name ?? null,
    monthlyAmount: monthlyAmount(subscription),
    created: new Date(subscription.created * 1000).toISOString(),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}

async function overview(stripe, query) {
  const [balance, ...lists] = await Promise.all([
    stripe.balance.retrieve(),
    ...LISTED_STATUSES.map((status) =>
      stripe.subscriptions
        .list({ status, limit: 100, expand: ['data.customer'] })
        .autoPagingToArray({ limit: MAX_SUBSCRIPTIONS })
    ),
  ]);

  const all = lists.flat().map(toRow);
  const needle = query.trim().toLowerCase();
  const subscriptions = needle
    ? all.filter((s) => [s.email, s.name, s.id].some((v) => v?.toLowerCase().includes(needle)))
    : all;

  return {
    balance: { available: sumCurrency(balance.available), pending: sumCurrency(balance.pending) },
    monthlyTotal: all.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.monthlyAmount, 0),
    total: all.length,
    subscriptions: subscriptions.sort((a, b) => b.created.localeCompare(a.created)),
  };
}

async function recordSecurityEvent(event, actor, details) {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db
    .from('security_events')
    .insert({ event, actor_id: actor.id, actor_email: actor.email ?? null, details });
  // Brak wpisu nie cofa wykonanej operacji w Stripe; blad trafia do logow.
  if (error) log.error('security_events.insert', error, { event });
}

/**
 * Panel finansow (/admin/finanse), tylko dla administratorow.
 * GET  ?q=      saldo Stripe, suma miesieczna wplat cyklicznych i ich lista (aktywne i z nieudana platnoscia)
 * POST { action: 'cancel', subscriptionId }   anulowanie wplaty cyklicznej; zapisuje wpis w security_events
 */
export default async function handler(req, res) {
  if (applyCors(req, res, { methods: ['GET', 'POST'] })) return;
  if (await rejectIfLimited(req, res, 'finance')) return;

  res.setHeader('Cache-Control', 'no-store');

  const admin = await requireAdmin(req);
  if (!admin) {
    log.security('finance_forbidden', req);
    return res.status(403).json({ code: 'forbidden', error: msg(req, 'forbidden') });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ code: 'stripe_config', error: msg(req, 'stripeNotConfigured') });
  }

  if (req.method === 'GET') {
    try {
      return res.status(200).json(await overview(stripe, String(req.query?.q ?? '').slice(0, 100)));
    } catch (err) {
      log.error('finance.overview', err, { type: err?.type ?? err?.name });
      return res.status(502).json({ code: 'server', error: msg(req, 'financeFailed') });
    }
  }

  const parsed = CancelSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ code: 'invalid', error: msg(req, 'invalid') });
  }

  try {
    const canceled = await stripe.subscriptions.cancel(parsed.data.subscriptionId);
    await recordSecurityEvent('subscription_canceled', admin, {
      subscription_id: canceled.id,
      customer_id: typeof canceled.customer === 'string' ? canceled.customer : canceled.customer?.id,
    });
    log.info('finance.subscription_canceled', { subscription_id: canceled.id, by: redact(admin.email) });
    return res.status(200).json({ ok: true, id: canceled.id, status: canceled.status });
  } catch (err) {
    log.error('finance.cancel', err, { type: err?.type ?? err?.name });
    return res.status(502).json({ code: 'server', error: msg(req, 'cancelFailed') });
  }
}
