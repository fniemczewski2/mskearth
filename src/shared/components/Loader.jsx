import PropTypes from 'prop-types';

import { useTranslations } from '../i18n/useTranslations.js';

/** Wskaznik ladowania ogloszany przez czytniki ekranu. */
export default function Loader({ label }) {
  const { t } = useTranslations();
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label ?? t.a11y?.loading ?? 'Ładowanie…'}</span>
    </div>
  );
}

Loader.propTypes = { label: PropTypes.string };
