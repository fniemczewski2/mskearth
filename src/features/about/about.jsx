import Goals from './goals.jsx';
import Seo from '../../shared/components/Seo.jsx';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { SITE_URL } from '../../shared/config/site.js';

export default function About() {
  const { t, lang, ready } = useTranslations();

  const about = Array.isArray(t.about) ? t.about : [];
  const h1 = t.about_h1 ?? about[0] ?? 'O nas';
  const paragraphs = Array.isArray(t.about_paragraphs) ? t.about_paragraphs : about.slice(1);

  return (
    <main className="about" aria-busy={ready ? 'false' : 'true'}>
      <Seo
        title={t.seo?.about?.title ?? 'O nas – Młodzieżowy Strajk Klimatyczny'}
        description={t.seo?.about?.description}
        url={`${SITE_URL}/${lang}/o-nas`}
      />
      <section aria-labelledby="about-title">
        <div className="page-intro">
          <h1 id="about-title">{h1}</h1>
          <span className="section-divider" aria-hidden="true" />
        </div>

        {!ready && (
          <div className="loader" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
          </div>
        )}

        {ready && paragraphs.length === 0 && <p role="alert">{t.about_error ?? 'Nie udało się wczytać treści.'}</p>}

        {ready && paragraphs.length > 0 && (
          <article>
            <div className="aboutText">
              {paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            <figure className="logoContainer">
              <img
                className="logo"
                src="/logoMSK-kolor.webp"
                alt={t.about_logoAlt ?? 'Logo Młodzieżowego Strajku Klimatycznego'}
                width="1024"
                height="1024"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </article>
        )}
      </section>
      <Goals />
    </main>
  );
}
