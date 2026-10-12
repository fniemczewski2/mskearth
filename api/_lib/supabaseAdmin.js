import { createClient } from '@supabase/supabase-js';

let client;

/**
 * Klient service_role tworzony przy pierwszym uzyciu, a nie przy imporcie.
 * Brak zmiennych nie wywraca juz calej funkcji (np. create-checkout-session),
 * tylko zwraca null – wywolujacy sam decyduje, czy to blad krytyczny.
 */
export function getSupabaseAdmin() {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  if (!client) {
    console.error(JSON.stringify({ level: 'error', msg: 'supabase_admin.missing_env', hasUrl: Boolean(url), hasKey: Boolean(key) }));
  }
  return client;
}

export function requireSupabaseAdmin() {
  const c = getSupabaseAdmin();
  if (!c) throw new Error('Brak SUPABASE_URL lub SUPABASE_SERVICE_KEY w zmiennych srodowiskowych.');
  return c;
}
