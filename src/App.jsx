import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Header from './header.jsx';
import Footer from './footer.jsx';
import Main from './main.jsx';
import Contact from './pages/contact.jsx';
import ArticlePage from './pages/articlePage.jsx';
import News from './pages/news.jsx';
import About from './pages/about.jsx';
import MapPage from './pages/map.jsx';
import Foundation from './pages/foundation.jsx';
import ThankYou from './pages/thankyou.jsx';
import NotFound from './pages/notFound.jsx';
import SideButtons from './components/sideButtons.jsx';
import CookieConsent from './components/cookies.jsx';
import { langFromPath, SUPPORTED_LANGS, useTranslations } from './i18n/useTranslations.js';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const lang = langFromPath(location.pathname);
  const { t } = useTranslations();
  const contentRef = useRef(null);
  const firstRender = useRef(true);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    contentRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleLanguageChange = (newLang) => {
    if (!SUPPORTED_LANGS.has(newLang)) return;
    const parts = location.pathname.split('/');
    parts[1] = newLang;
    navigate(parts.join('/') || `/${newLang}`, { replace: true });
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t.a11y?.skipToContent ?? 'Przejdź do treści'}
      </a>

      <Header lang={lang} handleLanguageChange={handleLanguageChange} />
      <CookieConsent />

      <div id="main-content" ref={contentRef} tabIndex={-1}>
        <Routes>
          <Route index element={<Main />} />
          <Route path="aktualnosci" element={<News />} />
          <Route path="aktualnosci/:id" element={<ArticlePage />} />
          <Route path="o-nas" element={<About />} />
          <Route path="miasta" element={<MapPage />} />
          <Route path="fundacja" element={<Foundation />} />
          <Route path="kontakt" element={<Contact />} />
          <Route path="dziekujemy" element={<ThankYou />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <SideButtons />
      <Footer lang={lang} handleLanguageChange={handleLanguageChange} />
    </>
  );
}
