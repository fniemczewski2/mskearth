// api/stripe-webhook.js
// Simplified webhook - records recurring payments as individual donations

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase with service key for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      // ONE-TIME PAYMENT COMPLETED
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      // RECURRING PAYMENT - Monthly invoice paid
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      // SUBSCRIPTION EVENTS (for logging/notifications)
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// Handle checkout session completed (initial payment)
async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id);

  const { customer_email, metadata } = session;
  const payment_type = metadata?.payment_type || 'onetime';

  // Update donation record with session completion
  const { error } = await supabase
    .from('donations')
    .update({
      status: session.payment_status === 'paid' ? 'completed' : 'pending',
      completed_at: session.payment_status === 'paid' ? new Date().toISOString() : null,
    })
    .eq('stripe_session_id', session.id);

  if (error) {
    console.error('Error updating donation after checkout:', error);
  }

  console.log(`Checkout completed for ${payment_type} payment`);
}

// Handle one-time payment succeeded
async function handlePaymentSucceeded(paymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  const { error } = await supabase
    .from('donations')
    .update({
      status: 'completed',
      stripe_payment_intent_id: paymentIntent.id,
      completed_at: new Date().toISOString(),
    })
    .or(`stripe_payment_intent_id.eq.${paymentIntent.id},stripe_session_id.eq.${paymentIntent.id}`);

  if (error) {
    console.error('Error updating payment:', error);
  }
}

// Handle payment failed
async function handlePaymentFailed(paymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  const { error } = await supabase
    .from('donations')
    .update({
      status: 'failed',
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Error updating failed payment:', error);
  }
}

// Handle recurring invoice payment (MAIN RECURRING LOGIC)
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);

  // Skip if this is not a subscription invoice
  if (!invoice.subscription) {
    console.log('Not a subscription invoice, skipping');
    return;
  }

  // Get customer and subscription details
  const customer = await stripe.customers.retrieve(invoice.customer);
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

  const amount = (invoice.amount_paid / 100).toFixed(2); // Convert from cents to PLN
  const metadata = subscription.metadata || {};

  // Check if this is the first invoice (already recorded during checkout)
  const isFirstInvoice = invoice.billing_reason === 'subscription_create';
  
  if (isFirstInvoice) {
    console.log('First invoice - already recorded during checkout, skipping');
    return;
  }

  // Create a NEW donation record for this recurring payment
  const { data, error } = await supabase
    .from('donations')
    .insert({
      amount: amount,
      currency: invoice.currency.toUpperCase(),
      donor_name: metadata.donor_name || null,
      donor_email: customer.email || metadata.donor_email,
      status: 'completed',
      stripe_session_id: null, // No session for recurring payments
      stripe_payment_intent_id: invoice.payment_intent,
      newsletter: metadata.newsletter === 'true' ? true : null,
      created_at: new Date().toISOString(),
      completed_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording recurring payment:', error);
  } else {
    console.log('Recurring payment recorded as donation:', data.id);
  }

  // Optionally: Send thank you email for recurring payment
  // await sendRecurringThankYouEmail(customer.email, amount);
}

// Handle recurring invoice payment failed
async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);

  if (!invoice.subscription) return;

  const customer = await stripe.customers.retrieve(invoice.customer);
  const amount = (invoice.amount_due / 100).toFixed(2);

  // Record failed payment attempt
  const { error } = await supabase
    .from('donations')
    .insert({
      amount: amount,
      currency: invoice.currency.toUpperCase(),
      donor_email: customer.email,
      status: 'failed',
      stripe_payment_intent_id: invoice.payment_intent,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error recording failed recurring payment:', error);
  }

}

async function handleSubscriptionCanceled(subscription) {
  console.log('Subscription canceled:', subscription.id);

  const customer = await stripe.customers.retrieve(subscription.customer);
  
  console.log(`Subscription canceled for ${customer.email}`);
}