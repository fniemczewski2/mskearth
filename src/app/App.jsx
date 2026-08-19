import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Header from '../layout/header.jsx';
import Footer from '../layout/footer.jsx';
import Main from '../features/home/homePage.jsx';
import Contact from '../features/contact/contact.jsx';
import ArticlePage from '../features/news/articlePage.jsx';
import News from '../features/news/news.jsx';
import About from '../features/about/about.jsx';
import MapPage from '../features/map/map.jsx';
import Foundation from '../features/foundation/foundation.jsx';
import ThankYou from '../features/donate/thankyou.jsx';
import NotFound from '../features/notFound/notFound.jsx';
import SideButtons from '../layout/sideButtons.jsx';
import CookieConsent from '../layout/cookies.jsx';
import { langFromPath, SUPPORTED_LANGS, useTranslations } from '../shared/i18n/useTranslations.js';
import useReveal from '../shared/hooks/useReveal.js';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const lang = langFromPath(location.pathname);
  const { t } = useTranslations();
  const contentRef = useRef(null);
  useReveal();
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
