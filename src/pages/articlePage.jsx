import React, { Link, useLocation, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import { toPublicUrl } from "../services/supabaseClient";

const LOCALE_CACHE = new Map();
const SUPPORTED_LOCALES = new Set(["pl", "en", "ua"]);

export default function ArticlePage({ articles = [] }) {
  const { id } = useParams();
  const location = useLocation();

  const language = useMemo(() => {
    const seg = (location.pathname.split("/")[1] || "").toLowerCase();
    return SUPPORTED_LOCALES.has(seg) ? seg : "pl";
  }, [location.pathname]);

  const [article, setArticle] = useState(() =>
    articles.find((a) => String(a?.id) === String(id)) || null
  );
  const [loading, setLoading] = useState(!article);
  const [t, setT] = useState({ articlePage: {} });

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImgRef = useRef(null);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        if (LOCALE_CACHE.has(language)) {
          if (isActive) setT(LOCALE_CACHE.get(language));
        } else {
          const res = await fetch(`/locales/${language}.json`, { credentials: "same-origin" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          LOCALE_CACHE.set(language, data);
          if (isActive) setT(data);
        }
      } catch (err) {
        console.error("Error loading translations:", err);
        if (isActive) setT({ articlePage: {} });
      }
    })();
    return () => { isActive = false; };
  }, [language]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (article) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("articles")
          .select(`
            id, accepted, created, published,
            imgurl, imgalt, author,
            sourcetext, sourcelink,
            title, subtitle, content,
            titleen, subtitleen, contenten,
            titleua, subtitleua, contentua
          `)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;

        if (!data) {
          if (active) setArticle(null);
        } else {
          const imgs = Array.isArray(data.imgurl) ? data.imgurl : (data.imgurl ? [data.imgurl] : []);
          const resolved = imgs.map((p) => toPublicUrl(p, "mskearth")).filter(Boolean);
          const normalized = { ...data, imgurl: resolved };
          if (active) setArticle(normalized);
        }
      } catch (err) {
        console.error("Fetch article error:", err);
        if (active) setArticle(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const found = articles.find((a) => String(a?.id) === String(id));
    if (found) {
      const imgs = Array.isArray(found.imgurl) ? found.imgurl : (found.imgurl ? [found.imgurl] : []);
      const hasHttp = imgs.some((u) => /^https?:\/\//i.test(u));
      const normalizedImgs = hasHttp ? imgs : imgs.map((p) => toPublicUrl(p, "mskearth")).filter(Boolean);
      setArticle({ ...found, imgurl: normalizedImgs });
      setLoading(false);
    }
  }, [articles, id]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [article?.id, article?.imgurl?.length]);

  const shareOrCopyUrl = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title, text: "" });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert(t.articlePage?.linkCopied || "Skopiowano link.");
      } else {
        const el = document.createElement("input");
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        alert(t.articlePage?.linkCopied || "Skopiowano link.");
      }
    } catch (err) {
      console.error(t.articlePage?.linkNotCopied || "Nie udało się skopiować linku.", err);
    }
  }, [t]);

  if (loading) {
    return (
      <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
        <span className="spinner" aria-hidden="true"/>
      </div>
    );
  }

  if (!article) {
    return (
      <main>
        <article>
          <p role="alert">{t.articlePage?.error || "Nie znaleziono artykułu."}</p>
        </article>
      </main>
    );
  }

  const pick = (obj, base, en, ua) => {
    if (language === "en") return obj[en] ?? obj[base] ?? "";
    if (language === "ua") return obj[ua] ?? obj[base] ?? "";
    return obj[base] ?? "";
  };

  const title = pick(article, "title", "titleen", "titleua");
  const subtitle = pick(article, "subtitle", "subtitleen", "subtitleua");
  const contentHtml = pick(article, "content", "contenten", "contentua");

  if (!contentHtml?.trim()) {
    return (
      <main>
        <article>
          <h3>{t.articlePage?.noTranslationTitle || "Brak tłumaczenia"}</h3>
          <p>{t.articlePage?.noTranslation || "Ten artykuł nie ma jeszcze tłumaczenia w wybranym języku."}</p>
        </article>
      </main>
    );
  }

  const safeHtml = DOMPurify.sanitize(contentHtml);

  const imgs = Array.isArray(article.imgurl) ? article.imgurl : [];
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

  const isAccepted =
    typeof article.accepted === "boolean" ? article.accepted : article.accepted !== "false";

  if (!isAccepted) {
    return (
      <main>
        <article>
          <p>{t.articlePage?.error || "Ten artykuł nie jest dostępny."}</p>
        </article>
      </main>
    );
  }

  return (
    <main>
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

ArticlePage.propTypes = {
  articles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      titleen: PropTypes.string,
      titleua: PropTypes.string,
      subtitle: PropTypes.string,
      subtitleen: PropTypes.string,
      subtitleua: PropTypes.string,
      content: PropTypes.string,
      contenten: PropTypes.string,
      contentua: PropTypes.string,
      created: PropTypes.string,
      accepted: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
      imgurl: PropTypes.arrayOf(PropTypes.string),
      imgalt: PropTypes.string,
      sourcetext: PropTypes.string,
      sourcelink: PropTypes.string,
    })
  ),
};
