import { Link } from 'react-router-dom';

import { useTranslations } from '../i18n/useTranslations.js';

/**
 * Wczesniej trasa catch-all robila <Navigate to="." replace />, czyli
 * po cichu przenosila na strone glowna. Dla wyszukiwarek to soft 404:
 * nieistniejacy adres zwracal HTTP 200 z pelna trescia.
 */
export default function NotFound() {
  const { t, lang } = useTranslations();

  return (
    <main className="not-found" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <title>404 — nie znaleziono strony | MSK</title>
      <meta name="robots" content="noindex" />

      <h1>{t.notFound?.title ?? 'Nie znaleźliśmy tej strony'}</h1>
      <p>{t.notFound?.message ?? 'Adres mógł się zmienić albo strona została usunięta.'}</p>
      <Link to={`/${lang}`} className="primaryBtn">
        {t.notFound?.home ?? 'Wróć na stronę główną'}
      </Link>
    </main>
  );
}
