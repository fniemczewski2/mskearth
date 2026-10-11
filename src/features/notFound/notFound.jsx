import { Link } from 'react-router-dom';

import Seo from '../../shared/components/Seo.jsx';
import { useTranslations } from '../../shared/i18n/useTranslations.js';

export default function NotFound() {
  const { t, lang } = useTranslations();

  return (
    <main className="not-found" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <Seo title={t.seo?.notFound?.title ?? 'Nie znaleziono strony – MSK'} noindex />

      <i className="bi bi-signpost-split emptyStateIcon" aria-hidden="true" />
      <h1>{t.notFound?.title ?? 'Nie znaleźliśmy tej strony'}</h1>
      <p>{t.notFound?.message ?? 'Adres mógł się zmienić albo strona została usunięta.'}</p>
      <Link to={`/${lang}`} className="primaryBtn">
        {t.notFound?.home ?? 'Wróć na stronę główną'}
      </Link>
    </main>
  );
}
