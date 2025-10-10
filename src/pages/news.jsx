import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { toPublicUrl } from '../services/supabaseClient';
import { supabase } from '../services/supabaseClient';

function News() {
  const [articles, setArticles] = useState([]);
  const articleRefs = useRef([]);
  const [translations, setTranslations] = useState({ news: {} });
  const location = useLocation();

  // język z URL (pl/en/ua)
  const language = useMemo(() => {
    const seg = location.pathname.split('/')[1] || 'pl';
    return ['pl', 'en', 'ua'].includes(seg) ? seg : 'pl';
  }, [location.pathname]);

  // stały "teraz" do filtrowania przyszłych publikacji
  const nowTs = useMemo(() => Date.now(), []);

  const stripTags = (html = '') => html.replace(/<\/?[^>]+(>|$)/g, '');

  const fetchTranslations = useCallback(async (lang) => {
    try {
      const res = await fetch(`/locales/${lang}.json`);
      if (!res.ok) throw new Error(`i18n HTTP ${res.status}`);
      const data = await res.json();
      setTranslations(data);
    } catch (err) {
      console.error('Error loading translations:', err);
      setTranslations({ news: { h1: 'Aktualności', more: 'Więcej' } });
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          accepted,
          published,
          created,
          imgurl,
          imgalt,
          author,
          sourcetext,
          sourcelink,
          title,
          subtitle,
          content,
          titleen,
          subtitleen,
          contenten,
          titleua,
          subtitleua,
          contentua
        `)
        .order('published', { ascending: false });

      if (error) throw error;

      // zamiana storage paths -> publiczne URL-e (bucket: mskearth)
      const list = (data || []).map((a) => ({
        ...a,
        imgurl: Array.isArray(a.imgurl)
          ? a.imgurl.map((p) => toPublicUrl(p, 'mskearth')).filter(Boolean)
          : [],
      }));

      // filtrowanie wg accepted/published + dostępności tłumaczeń
      const filtered = list.filter((article) => {
        if (article.accepted === false) return false; // null => TRUE (domyślnie akceptowany)
        const pubTs = article.published ? new Date(article.published).getTime() : 0;
        if (pubTs > nowTs) return false;

        if (language === 'pl') return true;

        const suffix = language === 'en' ? 'en' : 'ua';
        const t = article[`title${suffix}`];
        const s = article[`subtitle${suffix}`];
        const c = article[`content${suffix}`];
        return Boolean((t || '').trim() && (s || '').trim() && (c || '').trim());
      });

      setArticles(filtered);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setArticles([]);
    }
  }, [language, nowTs]);

  useEffect(() => {
    fetchTranslations(language);
  }, [language, fetchTranslations]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // pola językowe z DB (lowercase: titleen/subtitleen/contenten itd.)
  const suffix = language === 'pl' ? '' : language; // '', 'en', 'ua'
  const titleField = suffix ? `title${suffix}` : 'title';
  const subtitleField = suffix ? `subtitle${suffix}` : 'subtitle';
  const contentField = suffix ? `content${suffix}` : 'content';

  return (
    <>
    <main className="news">
      <h1>{translations.news?.h1 || 'Aktualności'}</h1>
      {articles.map((article, index) => {
        const rawContent = article[contentField] || '';
        const sanitizedContent = stripTags(rawContent).trim();
        if (!sanitizedContent) return null;

        const displayText =
          sanitizedContent.length > 200
            ? `${sanitizedContent.substring(0, 200)}...`
            : sanitizedContent;

        return (
          <React.Fragment key={article.id}>
            <article
              className="newsElement"
              ref={(el) => (articleRefs.current[index] = el)}
            >
              {article.imgurl?.length > 0 && (
                <div className="newsImages">
                  <img
                    className="newsImg"
                    src={article.imgurl[0]}
                    alt={article.imgalt || ''}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}

              <div className="newsText">
                <h3>{article[titleField]}</h3>
                {article[subtitleField] && <h5>{article[subtitleField]}</h5>}
                <hr />
                <p>{displayText}</p>
                <div className="newsBottomData">
                  {sanitizedContent.length > 200 && (
                    <Link to={`/${language}/aktualnosci/${article.id}`}>
                      {translations.news?.more || 'Więcej'}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          </React.Fragment>
        );
      })}
    </main>
    </>
  );
}

export default News;
