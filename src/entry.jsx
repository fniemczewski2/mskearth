import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import App from './App.jsx';
import AdminPanel from './pages/admin/adminPanel.jsx';
import RequireAdmin from './components/auth/RequireAdmin.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { DEFAULT_LANG } from './i18n/useTranslations.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/${DEFAULT_LANG}`} replace />} />
          <Route
            path="/admin/*"
            element={
              <RequireAdmin>
                <AdminPanel />
              </RequireAdmin>
            }
          />
          <Route path=":lang/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
