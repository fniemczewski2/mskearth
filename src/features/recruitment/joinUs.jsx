import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { DEFAULT_RECRUITMENT_STEPS } from './recruitmentDefaults.js';

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
        const withSteps = await supabase
          .from('recruitments')
          .select('id, instagram, form, steps')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let recData = withSteps.data;
        if (withSteps.error) {
          // steps column not migrated yet, retry without it
          const fallback = await supabase
            .from('recruitments')
            .select('id, instagram, form')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fallback.error) throw fallback.error;
          recData = fallback.data;
        }

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

  const steps = useMemo(() => {
    if (Array.isArray(recruitment?.steps) && recruitment.steps.length > 0) {
      return recruitment.steps;
    }
    return DEFAULT_RECRUITMENT_STEPS.map((step, i) => {
      if (i === 0 && recruitment?.instagram) return { ...step, link: recruitment.instagram };
      if (i === 2 && recruitment?.form) return { ...step, link: recruitment.form };
      return step;
    });
  }, [recruitment]);

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
          <ol className="recruitmentSteps">
            {steps.map((step, i) => (
              <li className="recruitmentStep" key={i}>
                <span className="recruitmentStepNumber" aria-hidden="true">{i + 1}</span>
                <div className="recruitmentStepBody">
                  <p className="recruitmentStepText">{step.text}</p>
                  {step.link && (
                    <a
                      className="joinUsButton"
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {step.linkLabel || 'Link'}&nbsp;<i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </>
  );
}
