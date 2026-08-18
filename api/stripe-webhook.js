import Stripe from 'stripe';

import { log } from './_lib/log.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';

export const config = { api: { bodyParser: false } };

const STRIPE_API_VERSION = '2025-08-27.basil';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  maxNetworkRetries: 2,
});

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
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
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

async function handleCheckoutCompleted(session) {
  const paid = session.payment_status === 'paid';

  const { error } = await supabaseAdmin
    .from('donations')
    .update({
      status: paid ? 'completed' : 'pending',
      completed_at: paid ? new Date().toISOString() : null,
      stripe_payment_intent_id: session.payment_intent ?? null,
    })
    .eq('stripe_session_id', session.id);

  if (error) throw error;
  log.info('checkout.completed', { session_id: session.id, paid });
}

async function handlePaymentSucceeded(paymentIntent) {
  const { error } = await supabaseAdmin
    .from('donations')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) throw error;
}

async function handlePaymentFailed(paymentIntent) {
  const { error } = await supabaseAdmin
    .from('donations')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) throw error;
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
