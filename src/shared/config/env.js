/**
 * Zmienne dostepne w przegladarce. Vite wystawia tylko nazwy z prefiksow podanych w envPrefix
 * (vite.config.js): VITE_, SUPABASE_URL i SUPABASE_PUBLISHABLE_. SUPABASE_SECRET_KEY do bundla nie trafia.
 * Starsze nazwy (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) nadal dzialaja.
 */
const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const missing = [
  [supabaseUrl, 'SUPABASE_URL'],
  [supabaseKey, 'SUPABASE_PUBLISHABLE_KEY'],
]
  .filter(([value]) => !value)
  .map(([, name]) => name);

if (missing.length > 0) {
  throw new Error(
    `Brak zmiennych srodowiskowych: ${missing.join(', ')}. ` +
      'Uzupelnij .env.local (wzor w .env.example) i zrestartuj Vite.'
  );
}

if (String(supabaseKey).startsWith('sb_secret_')) {
  throw new Error(
    'SUPABASE_PUBLISHABLE_KEY zawiera klucz secret. W przegladarce wolno uzyc tylko klucza publishable.'
  );
}

export const env = {
  supabaseUrl,
  supabaseKey,
  // Pusta wartosc z .env (VITE_AUTH_CALLBACK_URL=) znaczy "brak": logowanie wraca wtedy na /admin.
  authCallbackUrl: import.meta.env.VITE_AUTH_CALLBACK_URL || undefined,
};
