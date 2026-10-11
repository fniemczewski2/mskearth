import { log, redact } from './_lib/log.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { stripe } from './_lib/stripe.js';
import { subscribeToKit } from './_lib/kit.js';

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function subscriptionIdOf(invoice) {
  return (
    invoice.parent?.subscription_details?.subscription ??
    invoice.subscription ??
    null
  );
}

function paymentIntentIdOf(invoice) {
  const fromPayments = invoice.payments?.data?.[0]?.payment?.payment_intent;
  return fromPayments ?? invoice.payment_intent ?? null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      raw,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    log.error('webhook.signature', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSession(event.data.object);
        break;
      // BLIK i Przelewy24 koncza sie asynchronicznie: sesja jest "completed" ze statusem "unpaid",
      // a wynik platnosci przychodzi w jednym z ponizszych zdarzen.
      case 'checkout.session.async_payment_succeeded':
        await handleSession(event.data.object, 'completed');
        break;
      case 'checkout.session.async_payment_failed':
        await handleSession(event.data.object, 'failed');
        break;
      case 'payment_intent.succeeded':
        await updateByPaymentIntent(event.data.object.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        break;
      case 'payment_intent.payment_failed':
        await updateByPaymentIntent(event.data.object.id, { status: 'failed' });
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object, event.id);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object, event.id);
        break;
      case 'customer.subscription.deleted':
        log.info('subscription.canceled', { subscription_id: event.data.object.id });
        break;
      default:
        log.info('webhook.ignored', { type: event.type });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    log.error('webhook.handler', err, { type: event.type, event_id: event.id });
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}

function statusOf(session, forced) {
  if (forced) return forced;
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
    ? 'completed'
    : 'pending';
}

async function handleSession(session, forcedStatus) {
  const status = statusOf(session, forcedStatus);
  const metadata = session.metadata ?? {};
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;

  const patch = {
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    stripe_payment_intent_id: paymentIntentId,
  };

  let query = supabaseAdmin.from('donations').update(patch).eq('stripe_session_id', session.id);
  // Stripe nie gwarantuje kolejnosci zdarzen: spozniony/ponowiony "pending" nie moze
  // cofnac juz zaksiegowanej wplaty.
  if (status === 'pending') query = query.eq('status', 'pending');
  const { data: updated, error } = await query.select('id');
  if (error) throw error;

  if (!updated || updated.length === 0) {
    if (status === 'pending') {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('donations')
        .select('id')
        .eq('stripe_session_id', session.id)
        .limit(1);
      if (existingError) throw existingError;
      if (existing && existing.length > 0) return;
    }
    // Wiersz "pending" nie powstal przy tworzeniu sesji: odtwarzamy go z metadanych.
    const { error: insertError } = await supabaseAdmin.from('donations').insert({
      ...patch,
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? 'pln').toUpperCase(),
      donor_name: metadata.donor_name || null,
      donor_email: session.customer_details?.email ?? metadata.donor_email ?? null,
      stripe_session_id: session.id,
      newsletter: metadata.newsletter === 'true',
      payment_type: metadata.payment_type === 'recurring' ? 'recurring' : 'onetime',
    });
    if (insertError && insertError.code !== '23505') throw insertError;
    log.warn('checkout.row_recreated', { session_id: session.id });
  }

  log.info('checkout.session', { session_id: session.id, status });

  if (status === 'completed' && metadata.newsletter === 'true') {
    const email = session.customer_details?.email ?? metadata.donor_email;
    if (email) {
      try {
        await subscribeToKit(email);
      } catch (err) {
        // Brak zapisu do newslettera nie moze blokowac ksiegowania darowizny.
        log.error('donor.newsletter', err, { email: redact(email) });
      }
    }
  }
}

async function updateByPaymentIntent(paymentIntentId, patch) {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .update(patch)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    // Zdarzenie przyszlo przed checkout.session.*; status ustawi zdarzenie sesji.
    log.info('payment_intent.unmatched', { payment_intent_id: paymentIntentId });
  }
}

async function handleInvoicePaymentSucceeded(invoice, eventId) {
  const subscriptionId = subscriptionIdOf(invoice);
  if (!subscriptionId) return;

  if (invoice.billing_reason === 'subscription_create') return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadata = subscription.metadata ?? {};

  const { error } = await supabaseAdmin.from('donations').insert({
    stripe_event_id: eventId,
    amount: invoice.amount_paid / 100,
    currency: (invoice.currency ?? 'pln').toUpperCase(),
    donor_name: metadata.donor_name || null,
    donor_email: invoice.customer_email ?? metadata.donor_email ?? null,
    status: 'completed',
    payment_type: 'recurring',
    stripe_payment_intent_id: paymentIntentIdOf(invoice),
    completed_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString(),
  });

  if (error && error.code !== '23505') throw error;

  log.info('recurring.recorded', { invoice_id: invoice.id, duplicate: error?.code === '23505' });
}

async function handleInvoicePaymentFailed(invoice, eventId) {
  if (!subscriptionIdOf(invoice)) return;

  const { error } = await supabaseAdmin.from('donations').insert({
    stripe_event_id: eventId,
    amount: invoice.amount_due / 100,
    currency: (invoice.currency ?? 'pln').toUpperCase(),
    donor_email: invoice.customer_email ?? null,
    status: 'failed',
    payment_type: 'recurring',
    stripe_payment_intent_id: paymentIntentIdOf(invoice),
  });

  if (error && error.code !== '23505') throw error;
}
