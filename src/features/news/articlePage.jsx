import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';

import Seo from '../../shared/components/Seo.jsx';
import { sanitizeArticle } from '../../shared/lib/sanitize.js';
import { format, useTranslations } from '../../shared/i18n/useTranslations.js';
import { FOUNDATION_NAME, ORG_NAME, SITE_URL } from '../../shared/config/site.js';
import { getPublishedArticleById } from './db/article.js';

const FIELDS = {
  pl: { title: 'title', subtitle: 'subtitle', content: 'content' },
  en: { title: 'titleen', subtitle: 'subtitleen', content: 'contenten' },
};

function plainText(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export default function ArticlePage() {
  const { id } = useParams();
  const { t, lang } = useTranslations();
  const a = t.articlePage ?? {};

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState('');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImgRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getPublishedArticleById(id)
      .then((data) => {
        if (active) {
          setArticle(data);
          setCurrentImageIndex(0);
        }
      })
      .catch((err) => {
        console.error('Nie udalo sie pobrac artykulu:', err);
        if (active) setArticle(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const shareOrCopyUrl = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
      await navigator.clipboard?.writeText(url);
      setShareStatus(a.linkCopied ?? 'Link skopiowano do schowka!');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('Nie udalo sie udostepnic linku:', err);
      setShareStatus(a.linkNotCopied ?? 'Nie udało się skopiować linku.');
    }
  }, [a.linkCopied, a.linkNotCopied]);

  const f = FIELDS[lang] ?? FIELDS.pl;
  const title = article?.[f.title] || '';
  const subtitle = article?.[f.subtitle] || '';
  const contentHtml = article?.[f.content] || '';

  const safeHtml = useMemo(() => sanitizeArticle(contentHtml), [contentHtml]);

  if (loading) {
    return (
      <main>
        <div className="loader" role="status" aria-live="polite" aria-busy="true">
          <span className="spinner" aria-hidden="true" />
          <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
        </div>
      </main>
    );
  }

  const backLink = (
    <Link to={`/${lang}/aktualnosci`}>{a.backToList || 'Wróć do aktualności'}</Link>
  );

  if (!article) {
    return (
      <main>
        <Seo title={t.seo?.articleNotFound?.title ?? 'Nie znaleziono artykułu – MSK'} noindex />
        <article>
          <h1>{t.notFound?.title ?? 'Nie znaleźliśmy tej strony'}</h1>
          <p>{a.error || 'Nie znaleziono artykułu.'}</p>
          {backLink}
        </article>
      </main>
    );
  }

  if (!contentHtml.trim()) {
    return (
      <main>
        <Seo title={`${title || article.title || 'Artykuł'}${t.seo?.articleSuffix ?? ' – MSK'}`} noindex />
        <article>
          <h1>{a.noTranslationTitle || 'Brak tłumaczenia'}</h1>
          <p>{a.noTranslation || 'Ten artykuł nie ma jeszcze tłumaczenia w wybranym języku.'}</p>
          {backLink}
        </article>
      </main>
    );
  }

  const imgs = Array.isArray(article.imgurl) ? article.imgurl : [];
  const canonical = `${SITE_URL}/${lang}/aktualnosci/${article.id}`;
  const manyImages = imgs.length > 1;
  const description = subtitle || plainText(contentHtml).slice(0, 155) || title;
  const publishedISO = article.published || article.created || '';
  const publishedDate = publishedISO
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'pl-PL', { dateStyle: 'long' }).format(new Date(publishedISO))
    : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description,
    inLanguage: lang,
    mainEntityOfPage: canonical,
    datePublished: publishedISO || undefined,
    image: imgs.length ? imgs : [`${SITE_URL}/og-image.png`],
    author: { '@type': 'Organization', name: ORG_NAME },
    publisher: {
      '@type': 'Organization',
      name: FOUNDATION_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` },
    },
  };

  const imageAlt = (i) => {
    const base = article.imgalt || title;
    return manyImages ? `${base} – ${format(a.imageOf ?? 'obraz {n} z {total}', { n: i + 1, total: imgs.length })}` : base;
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((i) => (i > 0 ? i - 1 : imgs.length - 1));
    carouselImgRef.current?.focus();
  };
  const handleNextImage = () => {
    setCurrentImageIndex((i) => (i < imgs.length - 1 ? i + 1 : 0));
    carouselImgRef.current?.focus();
  };
  const handleCarouselKey = (e) => {
    if (e.key === 'ArrowLeft') handlePrevImage();
    if (e.key === 'ArrowRight') handleNextImage();
  };

  return (
    <main>
      <Seo title={`${title}${t.seo?.articleSuffix ?? ' – MSK'}`} description={description} image={imgs[0]} url={canonical} type="article" />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <article className="singleNewsElement" aria-labelledby="article-title">
        <div className="singleNewsTopInfo">
          <Link to={`/${lang}/aktualnosci`} aria-label={a.back || 'Wróć do aktualności'}>
            <i className="bi bi-arrow-left" aria-hidden="true" />
          </Link>

          {publishedDate && <time dateTime={publishedISO}>{publishedDate}</time>}

          <button
            type="button"
            className="icon-btn"
            onClick={shareOrCopyUrl}
            aria-label={a.share || 'Udostępnij lub skopiuj link'}
            title={a.share || 'Udostępnij lub skopiuj link'}
          >
            <i className="bi bi-share" aria-hidden="true" />
          </button>
          <span className="sr-only" role="status">{shareStatus}</span>
        </div>

        {imgs.length > 0 && (
          <div className="newsImages">
            {!manyImages ? (
              <figure>
                <img className="singleNewsImg" src={imgs[0]} alt={imageAlt(0)} decoding="async" />
              </figure>
            ) : (
              <div className="image-carousel" role="group" aria-roledescription={a.carousel ?? 'karuzela obrazów'}>
                <button
                  className="carousel-button prev"
                  onClick={handlePrevImage}
                  aria-label={a.prevImage || 'Poprzedni obraz'}
                  type="button"
                >
                  <i className="bi bi-arrow-left-short" aria-hidden="true" />
                </button>

                <img
                  ref={carouselImgRef}
                  className="singleNewsImg"
                  src={imgs[currentImageIndex]}
                  alt={imageAlt(currentImageIndex)}
                  decoding="async"
                  tabIndex={0}
                  onKeyDown={handleCarouselKey}
                />

                <button
                  className="carousel-button next"
                  onClick={handleNextImage}
                  aria-label={a.nextImage || 'Następny obraz'}
                  type="button"
                >
                  <i className="bi bi-arrow-right-short" aria-hidden="true" />
                </button>

                <div className="carousel-status" aria-live="polite">
                  {currentImageIndex + 1} / {imgs.length}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="singleNewsText">
          <h1 id="article-title" className="articleTitle">{title}</h1>
          {subtitle && <p className="articleSubtitle">{subtitle}</p>}
          <hr />

          <div className="article-content" dangerouslySetInnerHTML={{ __html: safeHtml }} />
          <hr />
          {article.sourcetext && article.sourcelink && (
            <p className="source">
              <strong>{a.source || 'Źródło:'}</strong>{' '}
              <a href={article.sourcelink} target="_blank" rel="noopener noreferrer nofollow">
                {article.sourcetext}
                <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
              </a>
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
