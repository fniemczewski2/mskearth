import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../style/goals.css';

const LOCALE_CACHE = new Map();

export default function Goals() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [t, setT] = useState({ goals_h2: 'Nasze Cele', goals: [] });
  const [loading, setLoading] = useState(true);
  const [err,   setErr] = useState('');

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
          const safe = {
            goals_h2: data?.goals_h2 || 'Nasze Cele',
            goals: Array.isArray(data?.goals) ? data.goals : [],
          };
          LOCALE_CACHE.set(language, safe);
          if (active) setT(safe);
        }
      } catch (e) {
        console.error('Error loading translations:', e);
        if (active) {
          setT({ goals_h2: 'Nasze Cele', goals: [] });
          setErr('Nie udało się wczytać treści.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [language]);

  return (
    <section className="goals" aria-busy={loading ? 'true' : 'false'}>
      <h2>{t.goals_h2 || 'Nasze Cele'}</h2>

      {loading && (
        <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
          <span className="spinner" aria-hidden="true"/>
        </div>
      )}

      {!loading && err && <p role="alert">{err}</p>}

      {!loading && !err && t.goals.map((section, idx) => {
        const title = section?.title || '';
        const iconClass = section?.icon || '';
        const items = Array.isArray(section?.content) ? section.content : [];
        return (
          <div className="goalsGroup" key={`${title}-${idx}`}>
            <h3>
              {iconClass && <i className={iconClass} aria-hidden="true" />}
              <span className="goalTitle">{title}</span>
            </h3>
            <div className="demands">
              {items.map((line, i) => (
                <article key={i}><p>{line}</p></article>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
