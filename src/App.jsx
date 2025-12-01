import React, { useEffect, useMemo, useState, useId, useCallback, lazy, Suspense} from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, BrowserRouter } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import ReactDOM from 'react-dom/client';
import Header from './header.jsx';
import Footer from './footer.jsx';
import Main from './main.jsx';
import Contact from './pages/contact.jsx';
import ArticlePage from './pages/articlePage.jsx';
import News from './pages/news.jsx';
import About from './pages/about.jsx';
import Map from './pages/map.jsx';
import Foundation from './pages/foundation.jsx';
import AdminPanel from './pages/admin/adminPanel.jsx';
import SideButtons from './components/sideButtons.jsx';
import CookieConsent from './components/cookies.jsx';
import './style/index.css';
import ThankYou from './pages/thankyou.jsx';

const LANGS = ['pl', 'en'];
const DEFAULT_LANG = 'pl';

const toPublicUrl = (path, bucket = 'public') => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
};

async function loadArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('id,accepted,published,created,imgurl,imgalt,author,sourcetext,sourcelink,title,subtitle,content,titleen,subtitleen,contenten,titleua,subtitleua,contentua')
    .order('published', { ascending: false });
  if (error) throw error;
  return (data || []).map(a => ({
    ...a,
    imgurl: Array.isArray(a.imgurl) ? a.imgurl.map(p => toPublicUrl(p)) : [],
  }));
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const lang = useMemo(() => {
    const seg = location.pathname.split('/')[1] || DEFAULT_LANG;
    return LANGS.includes(seg) ? seg : DEFAULT_LANG;
  }, [location.pathname]);

  const [articles, setArticles] = useState([]);

  useEffect(() => {
    loadArticles().then(setArticles).catch(err => console.error('Error fetching articles:', err));
  }, []);

  const handleLanguageChange = (newLang) => {
    if (!LANGS.includes(newLang)) return;
    const parts = location.pathname.split('/');
    parts[1] = newLang; 
    navigate(parts.join('/'), { replace: true });
  };

  return (
    <React.StrictMode>
      <Header lang={lang} handleLanguageChange={handleLanguageChange} />

      <CookieConsent/>

      <Routes>
          <Route index path="/" element={<Main />} />
          <Route path="/pl" element={<Main />} />
          <Route path="/en" element={<Main />} />
          <Route path="/aktualnosci" element={<News />} />
          <Route path="/o-nas" element={<About />} />
          <Route path="/miasta" element={<Map />} />
          <Route path="/fundacja" element={<Foundation />} />
          <Route path="/kontakt" element={<Contact />} />
          <Route path="/aktualnosci/:id" element={<ArticlePage articles={articles} />} />
          <Route path="/dziekujemy" element={<ThankYou />} />
          <Route path="*" element={<Navigate to="." replace />} />
      </Routes>

      <SideButtons />
      <Footer lang={lang} handleLanguageChange={handleLanguageChange} />
    </React.StrictMode>
  );
}
const root = document.getElementById('root');
ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path=":lang/*" element={<App />} />
      <Route path="/" element={<Navigate to={`/${DEFAULT_LANG}`} />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  </BrowserRouter>
);

