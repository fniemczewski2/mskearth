import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Header from '../layout/header.jsx';
import Footer from '../layout/footer.jsx';
import Main from '../features/home/homePage.jsx';
import SideButtons from '../layout/sideButtons.jsx';
import CookieConsent from '../layout/cookies.jsx';
import { langFromPath, SUPPORTED_LANGS, useTranslations } from '../shared/i18n/useTranslations.js';
import useReveal from '../shared/hooks/useReveal.js';

const News = lazy(() => import('../features/news/news.jsx'));
const ArticlePage = lazy(() => import('../features/news/articlePage.jsx'));
const About = lazy(() => import('../features/about/about.jsx'));
const MapPage = lazy(() => import('../features/map/map.jsx'));
const Foundation = lazy(() => import('../features/foundation/foundation.jsx'));
const Contact = lazy(() => import('../features/contact/contact.jsx'));
const DonatePage = lazy(() => import('../features/donate/donatePage.jsx'));
const ThankYou = lazy(() => import('../features/donate/thankyou.jsx'));
const NotFound = lazy(() => import('../features/notFound/notFound.jsx'));

function PageLoader({ label }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

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
    // Fokus na naglowku nowej strony, zeby czytnik ekranu ja oglosil; awaryjnie na kontenerze.
    const heading = contentRef.current?.querySelector('h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    } else {
      contentRef.current?.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleLanguageChange = (newLang) => {
    if (!SUPPORTED_LANGS.has(newLang)) return;
    const parts = location.pathname.split('/');
    parts[1] = newLang;
    navigate(`${parts.join('/') || `/${newLang}`}${location.search}${location.hash}`);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t.a11y?.skipToContent ?? 'Przejdź do treści'}
      </a>

      <Header lang={lang} handleLanguageChange={handleLanguageChange} />
      <CookieConsent />

      <div id="main-content" ref={contentRef} tabIndex={-1}>
        <Suspense fallback={<PageLoader label={t.a11y?.loading ?? 'Ładowanie…'} />}>
          <Routes>
            <Route index element={<Main />} />
            <Route path="aktualnosci" element={<News />} />
            <Route path="aktualnosci/:id" element={<ArticlePage />} />
            <Route path="o-nas" element={<About />} />
            <Route path="miasta" element={<MapPage />} />
            <Route path="fundacja" element={<Foundation />} />
            <Route path="kontakt" element={<Contact />} />
            <Route path="wesprzyj" element={<DonatePage />} />
            <Route path="dziekujemy" element={<ThankYou />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>

      <SideButtons />
      <Footer lang={lang} />
    </>
  );
}
