import Seo from '../../shared/components/Seo.jsx';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { SITE_URL } from '../../shared/config/site.js';
import Donate from './donate.jsx';

export default function DonatePage() {
  const { t, lang } = useTranslations();

  return (
    <main className="donate-page">
      <Seo
        title={t.seo?.donate?.title ?? 'Wesprzyj nas – Młodzieżowy Strajk Klimatyczny'}
        description={t.seo?.donate?.description}
        url={`${SITE_URL}/${lang}/wesprzyj`}
      />
      <div className="page-intro">
        <h1>{t.donate?.h2 ?? 'Wesprzyj nas!'}</h1>
        <span className="section-divider" aria-hidden="true" />
      </div>
      <Donate headingLevel={2} hideHeading />
    </main>
  );
}
