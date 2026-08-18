import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";

import Seo from "../components/Seo.jsx";
import { sanitizeArticle } from "../lib/sanitize.js";
import { useTranslations } from "../i18n/useTranslations.js";
import { getPublishedArticleById } from "../services/db/article.js";

export default function ArticlePage() {
  const { id } = useParams();
  const { t, lang } = useTranslations();
  const language = lang;

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImgRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getPublishedArticleById(id)
      .then((data) => {
        if (active) setArticle(data);
      })
      .catch((err) => {
        // Wczesniej try/catch obejmowal .then(), wiec bledy sieciowe
        // nie byly lapane, a setLoading(false) wykonywalo sie przed
        // rozwiazaniem obietnicy.
        console.error("Nie udalo sie pobrac artykulu:", err);
        if (active) setArticle(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [article?.id, article?.imgurl?.length]);

  const shareOrCopyUrl = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
      await navigator.clipboard?.writeText(url);
    } catch (err) {
      console.error("Nie udalo sie udostepnic linku:", err);
    }
  }, []);

  const pick = useCallback(
    (obj, base, en, ua) => {
      if (!obj) return "";
      if (language === "en") return obj[en] ?? obj[base] ?? "";
      if (language === "ua") return obj[ua] ?? obj[base] ?? "";
      return obj[base] ?? "";
    },
    [language]
  );

  const title = pick(article, "title", "titleen", "titleua");
  const subtitle = pick(article, "subtitle", "subtitleen", "subtitleua");
  const contentHtml = pick(article, "content", "contenten", "contentua");

  const safeHtml = useMemo(() => sanitizeArticle(contentHtml), [contentHtml]);

  if (loading) {
    return (
      <div className="loader" role="status" aria-live="polite" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        <span className="sr-only">Ładowanie artykułu…</span>
      </div>
    );
  }

  if (!article) {
    return (
      <main>
        <Seo title="Nie znaleziono artykułu | MSK" />
        <article>
          <p role="alert">{t.articlePage?.error || "Nie znaleziono artykułu."}</p>
          <Link to={`/${language}/aktualnosci`}>
            {t.articlePage?.backToList || "Wróć do aktualności"}
          </Link>
        </article>
      </main>
    );
  }

  if (!contentHtml?.trim()) {
    return (
      <main>
        <Seo title={`${title || "Artykuł"} | MSK`} />
        <article>
          <h3>{t.articlePage?.noTranslationTitle || "Brak tłumaczenia"}</h3>
          <p>
            {t.articlePage?.noTranslation ||
              "Ten artykuł nie ma jeszcze tłumaczenia w wybranym języku."}
          </p>
        </article>
      </main>
    );
  }


  const imgs = Array.isArray(article.imgurl) ? article.imgurl : [];
  const canonical = `https://msk.earth/${language}/aktualnosci/${article.id}`;
  const hasImages = imgs.length > 0;
  const manyImages = imgs.length > 1;

  const handlePrevImage = () => {
    setCurrentImageIndex((i) => (i > 0 ? i - 1 : imgs.length - 1));
    carouselImgRef.current?.focus();
  };
  const handleNextImage = () => {
    setCurrentImageIndex((i) => (i < imgs.length - 1 ? i + 1 : 0));
    carouselImgRef.current?.focus();
  };
  const handleCarouselKey = (e) => {
    if (e.key === "ArrowLeft") handlePrevImage();
    if (e.key === "ArrowRight") handleNextImage();
  };

  const createdISO = article.created || "";
  const createdDate = createdISO ? String(createdISO).split("T")[0] : "";

  return (
    <main>
      <Seo
        title={`${title} — MSK`}
        description={subtitle || title}
        image={imgs[0]}
        url={canonical}
        type="article"
      />

      <article className="singleNewsElement" aria-labelledby="article-title">
        <div className="singleNewsTopInfo">
          <Link to={`/${language}/aktualnosci`} aria-label={t.articlePage?.back || "Powrót do aktualności"}>
            <i className="bi bi-arrow-left" aria-hidden="true" />
          </Link>

          {createdDate && (
            <time dateTime={createdISO} aria-label={t.articlePage?.published || "Data publikacji"}>
              {createdDate}
            </time>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={shareOrCopyUrl}
            aria-label={t.articlePage?.share || "Udostępnij / skopiuj link"}
            title={t.articlePage?.share || "Udostępnij / skopiuj link"}
          >
            <i className="bi bi-share" aria-hidden="true" />
          </button>
        </div>

        {hasImages && (
          <div className="newsImages">
            {!manyImages ? (
              <figure>
                <img
                  className="singleNewsImg"
                  src={imgs[0]}
                  alt={article.imgalt || title || "Obraz artykułu"}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ) : (
              <div className="image-carousel" role="group" aria-roledescription="karuzela obrazów">
                <button
                  className="carousel-button prev"
                  onClick={handlePrevImage}
                  aria-label={t.articlePage?.prevImage || "Poprzedni obraz"}
                  type="button"
                >
                  <i className="bi bi-arrow-left-short" aria-hidden="true" />
                </button>

                <img
                  ref={carouselImgRef}
                  className="singleNewsImg"
                  src={imgs[currentImageIndex]}
                  alt={
                    article.imgalt ||
                    `${title || "Artykuł"} — obraz ${currentImageIndex + 1} z ${imgs.length}`
                  }
                  loading="eager"
                  decoding="async"
                  tabIndex={0}
                  onKeyDown={handleCarouselKey}
                />

                <button
                  className="carousel-button next"
                  onClick={handleNextImage}
                  aria-label={t.articlePage?.nextImage || "Następny obraz"}
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
          <h3 id="article-title">{title}</h3>
          {subtitle && <h5>{subtitle}</h5>}
          <hr />

          <div className="article-content" dangerouslySetInnerHTML={{ __html: safeHtml }} />
          <hr />
          {article.sourcetext && article.sourcelink && (
            <p className="source">
              <strong>{t.articlePage?.source || "Źródło:"}</strong>{" "}
              <a href={article.sourcelink} target="_blank" rel="noopener noreferrer nofollow">
                {article.sourcetext}
              </a>
            </p>
          )}
        </div>
      </article>
    </main>
  );
}

