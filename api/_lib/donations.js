import { subscribeToNewsletter } from './getresponse.js';
import { log, redact } from './log.js';
import { requireSupabaseAdmin } from './supabaseAdmin.js';

const FUNCTION_NOT_FOUND = 'PGRST202';

function paidStatus(session) {
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
    ? 'completed'
    : 'pending';
}

/**
 * Zapisuje w tabeli donations wynik sesji Checkout pobranej ze Stripe (zrodlem prawdy jest Stripe,
 * nie dane z przegladarki). Wywolanie jest idempotentne: ponowne potwierdzenie tej samej sesji
 * nie tworzy drugiego wiersza ani nie cofa statusu "completed". Zwraca zapisany status.
 */
export async function recordCheckoutSession(session) {
  const status = paidStatus(session);
  const metadata = session.metadata ?? {};
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const patch = {
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    stripe_payment_intent_id: paymentIntentId,
  };
  const row = {
    ...patch,
    amount: (session.amount_total ?? 0) / 100,
    currency: (session.currency ?? 'pln').toUpperCase(),
    donor_name: metadata.donor_name || null,
    donor_email: session.customer_details?.email ?? metadata.donor_email ?? null,
    stripe_session_id: session.id,
    newsletter: metadata.newsletter === 'true',
    payment_type: metadata.payment_type === 'recurring' ? 'recurring' : 'onetime',
  };

  const db = requireSupabaseAdmin();
  const { data: before } = await db
    .from('donations')
    .select('status')
    .eq('stripe_session_id', session.id)
    .limit(1)
    .maybeSingle();
  const alreadyCompleted = before?.status === 'completed';

  const { error: rpcError } = await db.rpc('record_donation_session', { p_row: row });
  // Baza bez migracji 20261114120000: sciezka zgodna wstecz.
  if (rpcError?.code === FUNCTION_NOT_FOUND) await recordLegacy(db, session.id, patch, row, status);
  else if (rpcError) throw rpcError;

  // Zapis do newslettera tylko przy pierwszym potwierdzeniu wplaty.
  if (status === 'completed' && !alreadyCompleted && row.newsletter && row.donor_email) {
    try {
      await subscribeToNewsletter(row.donor_email, { name: metadata.donor_name });
    } catch (err) {
      log.error('donor.newsletter', err, { email: redact(row.donor_email) });
    }
  }
  return status;
}

async function recordLegacy(db, sessionId, patch, row, status) {
  let query = db.from('donations').update(patch).eq('stripe_session_id', sessionId);
  if (status === 'pending') query = query.eq('status', 'pending');
  const { data: updated, error } = await query.select('id');
  if (error) throw error;
  if (updated?.length) return;

  const { data: existing, error: existingError } = await db
    .from('donations')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .limit(1);
  if (existingError) throw existingError;
  if (existing?.length) return;

  const { error: insertError } = await db.from('donations').insert(row);
  if (insertError && insertError.code !== '23505') throw insertError;
}
