import { createClient } from '@supabase/supabase-js';

import { env } from '../config/env.js';

export const supabase =
  globalThis.__supabase__ ??
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-client-info': 'mskearth-web/3.0.0' },
    },
  });

globalThis.__supabase__ = supabase;

export function toPublicUrl(pathOrUrl, bucket = 'mskearth', transform) {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(pathOrUrl, transform ? { transform } : undefined);
  return data?.publicUrl ?? '';
}

export async function signInWithEmail(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function checkIsAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return Boolean(data);
}
