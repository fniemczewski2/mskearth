const required = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  throw new Error(
    `Brak zmiennych srodowiskowych: ${missing.join(', ')}. ` +
      'Uzupelnij .env.local (wzor w .env.example) i zrestartuj Vite.'
  );
}

export const env = {
  supabaseUrl: required.VITE_SUPABASE_URL,
  supabaseAnonKey: required.VITE_SUPABASE_ANON_KEY,
  authCallbackUrl: import.meta.env.VITE_AUTH_CALLBACK_URL ?? undefined,
};
