import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../../services/supabaseClient';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import {
  DEFAULT_RECRUITMENT_STEPS,
  FORM_STEP_INDEX,
  INSTAGRAM_STEP_INDEX,
} from './recruitmentDefaults.js';

export default function JoinUs() {
  const { t } = useTranslations();
  const j = t.joinUs ?? {};

  const [recruitment, setRecruitment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const query = (columns) =>
          supabase
            .from('recruitments')
            .select(columns)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let { data, error } = await query('id, instagram, form, steps');
        // 42703 = brak kolumny steps (migracja jeszcze nie wdrozona); domyslne kroki nadal dzialaja.
        if (error?.code === '42703') ({ data, error } = await query('id, instagram, form'));
        if (error) throw error;
        if (active) setRecruitment(data || null);
      } catch (e) {
        console.error('JoinUs fetch error:', e);
        if (active) setErr(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const steps = useMemo(() => {
    if (Array.isArray(recruitment?.steps) && recruitment.steps.length > 0) {
      return recruitment.steps;
    }
    const translated = Array.isArray(j.defaultSteps) ? j.defaultSteps : [];
    return DEFAULT_RECRUITMENT_STEPS.map((step, i) => {
      const base = { ...step, ...(translated[i] ?? {}) };
      if (i === INSTAGRAM_STEP_INDEX && recruitment?.instagram) return { ...base, link: recruitment.instagram };
      if (i === FORM_STEP_INDEX && recruitment?.form) return { ...base, link: recruitment.form };
      return base;
    });
  }, [recruitment, j.defaultSteps]);

  return (
    <>
      <h2>{j.h2 || 'Dołącz do nas!'}</h2>

      <div className="panel joinUs" aria-busy={loading ? 'true' : 'false'}>
        {loading && (
          <div className="loader" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
          </div>
        )}

        {!loading && err && (
          <p role="alert">{j.loadError ?? 'Nie udało się wczytać danych rekrutacyjnych.'}</p>
        )}

        {!loading && !err && (
          <ol className="recruitmentSteps">
            {steps.map((step, i) => (
              <li className="recruitmentStep" key={`${i}-${step.text}`}>
                <span className="recruitmentStepNumber" aria-hidden="true">{i + 1}</span>
                <div className="recruitmentStepBody">
                  <p className="recruitmentStepText">{step.text}</p>
                  {step.link && (
                    <a className="joinUsButton" href={step.link} target="_blank" rel="noopener noreferrer">
                      {step.linkLabel || 'Link'}
                      <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
                      &nbsp;<i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
