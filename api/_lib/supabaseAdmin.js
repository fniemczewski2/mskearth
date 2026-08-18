import { createClient } from '@supabase/supabase-js';

/**
 * Klient service_role - omija RLS i ma pelny dostep do bazy.
 * Wolno go uzywac WYLACZNIE w funkcjach serverless (katalog /api).
 * Nigdy w src/ ani w plikach z public/.
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  throw new Error('Brak SUPABASE_URL lub SUPABASE_SERVICE_KEY w zmiennych srodowiskowych.');
}

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
