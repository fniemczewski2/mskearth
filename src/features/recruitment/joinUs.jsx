import { useMemo } from 'react';

import Loader from '../../shared/components/Loader.jsx';
import useQuery from '../../shared/hooks/useQuery.js';
import { safeHref } from '../../shared/lib/safeHref.js';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { DEFAULT_RECRUITMENT_STEPS, FORM_STEP_INDEX, INSTAGRAM_STEP_INDEX } from './recruitmentDefaults.js';

// Klient Supabase laduje sie osobnym plikiem, dopiero gdy sekcja potrzebuje danych.
export const fetchRecruitment = () =>
  import('./db/recruitmentSettings.js').then((m) => m.fetchPublicRecruitment());
export const RECRUITMENT_QUERY = 'recruitment';

export default function JoinUs() {
  const { t } = useTranslations();
  const j = t.joinUs ?? {};

  const { data: recruitment = null, loading, error: err } = useQuery(RECRUITMENT_QUERY, fetchRecruitment);

  const steps = useMemo(() => {
    if (Array.isArray(recruitment?.steps) && recruitment.steps.length > 0) {
      return recruitment.steps;
    }
    const translated = Array.isArray(j.defaultSteps) ? j.defaultSteps : [];
    return DEFAULT_RECRUITMENT_STEPS.map((step, i) => {
      const base = { ...step, ...(translated[i] ?? {}) };
      if (i === INSTAGRAM_STEP_INDEX && recruitment?.instagram)
        return { ...base, link: recruitment.instagram };
      if (i === FORM_STEP_INDEX && recruitment?.form) return { ...base, link: recruitment.form };
      return base;
    });
  }, [recruitment, j.defaultSteps]);

  return (
    <>
      <h2>{j.h2 || 'Dołącz do nas!'}</h2>

      <div className="panel joinUs" aria-busy={loading ? 'true' : 'false'}>
        {loading && <Loader />}

        {!loading && err && (
          <p role="alert">{j.loadError ?? 'Nie udało się wczytać danych rekrutacyjnych.'}</p>
        )}

        {!loading && !err && (
          <ol className="recruitmentSteps">
            {steps.map((step, i) => (
              <li className="recruitmentStep" key={`${i}-${step.text}`}>
                <span className="recruitmentStepNumber" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="recruitmentStepBody">
                  <p className="recruitmentStepText">{step.text}</p>
                  {safeHref(step.link) && (
                    <a
                      className="joinUsButton"
                      href={safeHref(step.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {step.linkLabel || 'Link'}
                      <span className="sr-only">
                        {' '}
                        {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}
                      </span>
                      &nbsp;
                      <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
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
