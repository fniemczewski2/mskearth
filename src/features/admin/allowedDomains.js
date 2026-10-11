// Domeny, z ktorych mozna logowac sie do panelu przez Google.
// Ta sama lista jest w supabase/migrations/*_admin_google_domains.sql (blokada po stronie serwera).
export const ALLOWED_ADMIN_DOMAINS = ['msk.earth', 'fpmsk.org.pl'];

/** Dokladne dopasowanie domeny (bez subdomen), bez wzgledu na wielkosc liter. */
export function isAllowedAdminEmail(email) {
  if (typeof email !== 'string') return false;
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return ALLOWED_ADMIN_DOMAINS.includes(domain);
}

function jwtClaims(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

/**
 * Czy ta sesja powstala z logowania OAuth (Google). Patrzymy na claim "amr" w tokenie
 * Supabase, bo app_metadata.provider to tylko PIERWSZY sposob logowania konta.
 */
export function isGoogleSession(session) {
  if (!session?.user) return false;
  const amr = jwtClaims(session.access_token ?? '')?.amr;
  if (Array.isArray(amr) && amr.some((m) => m?.method === 'oauth')) return true;
  return session.user.app_metadata?.provider === 'google';
}

export const DOMAIN_ERROR =
  'Logowanie przez Google jest dostępne tylko dla kont w domenach @msk.earth i @fpmsk.org.pl.';
