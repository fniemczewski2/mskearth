import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

import App from './App.jsx';
import { DEFAULT_LANG, SUPPORTED_LANGS } from '../shared/i18n/useTranslations.js';

// Panel administracyjny nie trafia do paczki, ktora pobiera kazdy odwiedzajacy.
const AdminPanel = lazy(() => import('../features/admin/adminPanel.jsx'));
const RequireAdmin = lazy(() => import('../features/admin/RequireAdmin.jsx'));

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

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${DEFAULT_LANG}`} replace />} />
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
