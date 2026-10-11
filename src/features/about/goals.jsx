import { useTranslations } from '../../shared/i18n/useTranslations.js';

export default function Goals() {
  const { t, ready } = useTranslations();
  const goals = Array.isArray(t.goals) ? t.goals : [];

  return (
    <section className="goals" data-reveal aria-busy={ready ? 'false' : 'true'}>
      <h2>{t.goals_h2 || 'Nasze cele'}</h2>

      {!ready && (
        <div className="loader" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
        </div>
      )}

      {ready &&
        goals.map((section, idx) => {
          const title = section?.title || '';
          const iconClass = section?.icon || '';
          const items = Array.isArray(section?.content) ? section.content : [];
          return (
            <div className="goalsGroup" key={`${title}-${idx}`} data-reveal>
              <h3>
                {iconClass && (
                  <span className="goalIconBadge" aria-hidden="true">
                    <i className={iconClass} />
                  </span>
                )}
                <span className="goalTitle">{title}</span>
              </h3>
              <div className="demands">
                {items.map((line) => (
                  <article key={line}>
                    <p>{line}</p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
    </section>
  );
}
