import { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

import App from './App.jsx';
import { DEFAULT_LANG, SUPPORTED_LANGS } from '../shared/i18n/useTranslations.js';
import lazyWithRetry from '../shared/lib/lazyWithRetry.js';

// Panel administracyjny nie trafia do paczki, ktora pobiera kazdy odwiedzajacy.
const AdminPanel = lazyWithRetry(() => import('../features/admin/adminPanel.jsx'));
const RequireAdmin = lazyWithRetry(() => import('../features/admin/RequireAdmin.jsx'));

// Renders the app when the URL already has a supported language prefix,
// otherwise redirects to the same path with the default language prepended
// (e.g. "/fundacja" -> "/pl/fundacja").
export function LangGate() {
  const { lang } = useParams();
  const { pathname, search, hash } = useLocation();

  if (!SUPPORTED_LANGS.has((lang ?? '').toLowerCase())) {
    return <Navigate to={`/${DEFAULT_LANG}${pathname}${search}${hash}`} replace />;
  }

  return <App />;
}

const AUTH_CALLBACK_PARAMS = ['code', 'error', 'error_description'];
const AUTH_CALLBACK_HASH = /(^|[#&])(access_token|error|error_code)=/;

/**
 * Strona glowna bez jezyka. Supabase odsyla tu po logowaniu Google, gdy adres /admin nie jest
 * na liscie Redirect URLs projektu: wtedy parametry logowania trafiaja do panelu zamiast przepasc.
 */
function RootRedirect() {
  const { search, hash } = useLocation();
  const params = new URLSearchParams(search);
  const isAuthCallback = AUTH_CALLBACK_PARAMS.some((p) => params.has(p)) || AUTH_CALLBACK_HASH.test(hash);

  if (isAuthCallback) return <Navigate to={`/admin${search}${hash}`} replace />;
  return <Navigate to={`/${DEFAULT_LANG}`} replace />;
}

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<p role="status">Ładowanie panelu…</p>}>
            <RequireAdmin>
              <AdminPanel />
            </RequireAdmin>
          </Suspense>
        }
      />
      <Route path=":lang/*" element={<LangGate />} />
    </Routes>
  );
}
