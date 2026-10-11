import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Seo from '../../shared/components/Seo.jsx';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { SITE_URL } from '../../shared/config/site.js';
import { fetchPublishedArticles } from './db/article.js';

const PREVIEW_LENGTH = 200;

function toPlainText(html = '') {
  // DOMParser dekoduje encje (&amp;, &nbsp;) i nie wykonuje skryptow.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function News() {
  const { t, lang } = useTranslations();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublishedArticles({ limit: 30 })
      .then((list) => {
        if (active) setArticles(list);
      })
      .catch((err) => {
        console.error('Error fetching articles:', err);
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const suffix = lang === 'pl' ? '' : lang;
  const field = (name) => `${name}${suffix}`;

  const visible = articles
    .map((article) => {
      const title = (article[field('title')] || '').trim();
      const text = toPlainText(article[field('content')] || '');
      return { article, title, text };
    })
    // Artykul jest widoczny w danym jezyku, gdy ma tytul i tresc (podtytul jest opcjonalny).
    .filter(({ title, text }) => title && text);

  return (
    <main className="news">
      <Seo
        title={t.seo?.news?.title ?? 'Aktualności – Młodzieżowy Strajk Klimatyczny'}
        description={t.seo?.news?.description}
        url={`${SITE_URL}/${lang}/aktualnosci`}
      />
      <div className="page-intro">
        <h1>{t.news?.h1 || 'Aktualności'}</h1>
        <span className="section-divider" aria-hidden="true" />
      </div>

      {loading && (
        <div className="loader" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
        </div>
      )}

      {!loading && (failed || visible.length === 0) && (
        <article className="emptyState">
          <i className="bi bi-journal-richtext emptyStateIcon" aria-hidden="true" />
          <p>{t.news?.empty || 'Nie mamy jeszcze żadnych wpisów. Zajrzyj tu wkrótce.'}</p>
        </article>
      )}

      {visible.map(({ article, title, text }) => {
        const href = `/${lang}/aktualnosci/${article.id}`;
        const preview = text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH).trimEnd()}…` : text;
        const subtitle = article[field('subtitle')];

        return (
          <article className="newsElement" key={article.id}>
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
              <h2 className="newsTitle">
                <Link to={href}>{title}</Link>
              </h2>
              {subtitle && <p className="newsSubtitle">{subtitle}</p>}
              <hr />
              <p>{preview}</p>
              <div className="newsBottomData">
                <Link to={href} aria-hidden="true" tabIndex={-1}>
                  {t.news?.more || 'Czytaj dalej'}
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </main>
  );
}

export default News;
