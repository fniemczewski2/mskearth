import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const LOCALE_CACHE = new Map();

export default function JoinUs() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [t, setT] = useState({ joinUs: {} });

  const [recruitment, setRecruitment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (LOCALE_CACHE.has(language)) {
          if (active) setT(LOCALE_CACHE.get(language));
        } else {
          const res = await fetch(`/locales/${language}.json`, { credentials: 'same-origin' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          LOCALE_CACHE.set(language, data);
          if (active) setT(data);
        }
      } catch (e) {
        console.error('JoinUs i18n error:', e);
        if (active) setT({ joinUs: {} });
      }
    })();
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const { data: recData, error: recErr } = await supabase
          .from('recruitments')
          .select('id, instagram, form')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (recErr) throw recErr;

        if (!active) return;
        setRecruitment(recData || null);
      } catch (e) {
        console.error('JoinUs fetch error:', e);
        if (active) setErr('Nie udało się wczytać danych rekrutacyjnych.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <>
      <h2>{t.joinUs?.h2 || 'Dołącz do nas'}</h2>

      <aside id="joinUs" className="joinUs" aria-busy={loading ? 'true' : 'false'}>
        {loading && (
          <div className="loader" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true"/>
            <span className="sr-only">Ładowanie…</span>
          </div>
        )}

        {!loading && err && <p role="alert">{err}</p>}

        {!loading && !err && (
          <ul>
            <li className="joinUsActionContainer">
              <div className="joinUsAction heading">
                <p className="joinUsActionHeader">
                  <i className="bi bi-instagram joinUsIcon" aria-hidden="true"></i>
                  {t.joinUs?.follow || 'Obserwuj'}&nbsp;
                </p>
              </div>
              <div className="joinUsAction data">
                <p className="joinUsActionDetails">@msk_dolacz</p>
                {recruitment?.instagram && (
                  <a
                    className="joinUsButton"
                    href={recruitment.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Link&nbsp;<i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                  </a>
                )}
              </div>
            </li>

            {recruitment?.form && (
              <li className="joinUsActionContainer">
                <div className="joinUsAction">
                  <p className="joinUsActionHeader">
                    <i className="bi bi-play-btn-fill joinUsIcon" aria-hidden="true"></i>
                    {t.joinUs?.filloutForm || 'Obejrzyj film'}
                  </p>
                  <a
                    className="joinUsButton"
                    href={recruitment.form}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Link&nbsp;<i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                  </a>
                </div>
              </li>
            )}
          </ul>
        )}
      </aside>
    </>
  );
}
