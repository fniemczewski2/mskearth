import { Suspense, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Header from '../layout/header.jsx';
import Footer from '../layout/footer.jsx';
import Main from '../features/home/homePage.jsx';
import SideButtons from '../layout/sideButtons.jsx';
import CookieConsent from '../layout/cookies.jsx';
import { langFromPath, SUPPORTED_LANGS, useTranslations } from '../shared/i18n/useTranslations.js';
import useReveal from '../shared/hooks/useReveal.js';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';
import Loader from '../shared/components/Loader.jsx';
import lazyWithRetry from '../shared/lib/lazyWithRetry.js';
import { initAnalytics, trackPageView } from '../shared/lib/analytics.js';

const News = lazyWithRetry(() => import('../features/news/news.jsx'));
const ArticlePage = lazyWithRetry(() => import('../features/news/articlePage.jsx'));
const About = lazyWithRetry(() => import('../features/about/about.jsx'));
const MapPage = lazyWithRetry(() => import('../features/map/map.jsx'));
const Foundation = lazyWithRetry(() => import('../features/foundation/foundation.jsx'));
const Contact = lazyWithRetry(() => import('../features/contact/contact.jsx'));
const DonatePage = lazyWithRetry(() => import('../features/donate/donatePage.jsx'));
const ThankYou = lazyWithRetry(() => import('../features/donate/thankyou.jsx'));
const SubscriptionPage = lazyWithRetry(() => import('../features/donate/subscriptionPage.jsx'));
const SurveyPage = lazyWithRetry(() => import('../features/survey/surveyPage.jsx'));
const NotFound = lazyWithRetry(() => import('../features/notFound/notFound.jsx'));

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

  useEffect(() => initAnalytics(), []);

  useEffect(() => {
    // Tytul strony ustawia komponent Seo po renderze, stad odroczenie pomiaru.
    const id = setTimeout(() => trackPageView(), 0);
    return () => clearTimeout(id);
  }, [location.pathname]);

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
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<Loader />}>
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
              <Route path="subskrypcja" element={<SubscriptionPage />} />
              <Route path="ankieta/:slug" element={<SurveyPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>

      <SideButtons />
      <Footer lang={lang} />
    </>
  );
}
