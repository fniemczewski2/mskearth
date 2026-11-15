import { createClient } from '@supabase/supabase-js';

import { env } from '../shared/config/env.js';
import { STORAGE_BUCKET } from '../shared/config/site.js';

export const supabase =
  globalThis.__supabase__ ??
  createClient(env.supabaseUrl, env.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-client-info': `mskearth-web/${__APP_VERSION__}` },
    },
  });

globalThis.__supabase__ = supabase;

export function toPublicUrl(pathOrUrl, bucket = STORAGE_BUCKET, transform) {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(pathOrUrl, transform ? { transform } : undefined);
  return data?.publicUrl ?? '';
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function checkIsAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return Boolean(data);
}
