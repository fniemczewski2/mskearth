import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Goals from './goals';

const LOCALE_CACHE = new Map();

export default function About() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [t, setT] = useState({ about: [], about_h1: '', about_paragraphs: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        if (LOCALE_CACHE.has(language)) {
          if (active) setT(LOCALE_CACHE.get(language));
        } else {
          const res = await fetch(`/locales/${language}.json`, { credentials: 'same-origin' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          // Backward + forward compatible normalization
          const normalized = {
            about_h1: data?.about_h1 ?? (Array.isArray(data?.about) ? data.about[0] : ''),
            about_paragraphs: Array.isArray(data?.about_paragraphs)
              ? data.about_paragraphs
              : (Array.isArray(data?.about) ? data.about.slice(1) : []),
            ...data,
          };

          LOCALE_CACHE.set(language, normalized);
          if (active) setT(normalized);
        }
      } catch (e) {
        console.error('About i18n error:', e);
        if (active) {
          setT({ about: [], about_h1: '', about_paragraphs: [] });
          setErr('Nie udało się wczytać treści.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [language]);

  return (
    <main className="about" aria-busy={loading ? 'true' : 'false'}>
      <section aria-labelledby="about-title">
        <h1 id="about-title">{t.about_h1 || 'O nas'}</h1>

        {loading && (
          <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
            <span className="spinner" aria-hidden="true"/>
          </div>
        )}

        {!loading && err && <p role="alert">{err}</p>}

        {!loading && !err && (
          <article>
            <div className="aboutText">
              {t.about_paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <figure className="logoContainer">
              <img
                className="logo"
                src="/logoMSK-kolor.png"
                alt="Logo Młodzieżowego Strajku Klimatycznego"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </article>
        )}
      </section>

      {/* Goals already handles its own i18n + loading */}
      <Goals />
    </main>
  );
}
