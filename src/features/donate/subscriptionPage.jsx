import Seo from '../../shared/components/Seo.jsx';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { CONTACT_EMAIL, SITE_URL } from '../../shared/config/site.js';

/** Link logowania do portalu klienta Stripe; przyjmowane sa tylko adresy https://billing.stripe.com. */
function portalLoginUrl() {
  const raw = import.meta.env.VITE_STRIPE_PORTAL_LOGIN_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' && url.hostname === 'billing.stripe.com') return url.toString();
  } catch {
    // Nieprawidlowy adres: strona pokaze kontakt e-mail.
  }
  console.error('VITE_STRIPE_PORTAL_LOGIN_URL musi byc adresem https://billing.stripe.com/...');
  return null;
}

/** Zarzadzanie wplata cykliczna: logowanie do portalu klienta Stripe adresem e-mail albo kontakt z fundacja. */
export default function SubscriptionPage() {
  const { t, lang } = useTranslations();
  const s = t.subscription ?? {};
  const portalHref = portalLoginUrl();

  return (
    <main className="subscription">
      <Seo
        title={t.seo?.subscription?.title ?? 'Wpłata cykliczna | Młodzieżowy Strajk Klimatyczny'}
        description={t.seo?.subscription?.description}
        url={`${SITE_URL}/${lang}/subskrypcja`}
        noindex
      />
      <div className="page-intro">
        <h1>{s.h1 ?? 'Wpłata cykliczna'}</h1>
        <span className="section-divider" aria-hidden="true" />
      </div>

      <div className="panel subscription-panel">
        <p>
          {s.intro ??
            'Comiesięczną darowiznę możesz w każdej chwili zmienić albo anulować. Obsługuje to Stripe, nasz operator płatności.'}
        </p>

        {portalHref ? (
          <>
            <p>
              {s.portalHint ??
                'Podaj adres e-mail użyty przy wpłacie. Stripe wyśle na niego link do panelu, w którym zmienisz kartę, kwotę lub anulujesz wpłatę.'}
            </p>
            <a className="primaryBtn" href={portalHref} target="_blank" rel="noopener noreferrer">
              {s.portalCta ?? 'Zarządzaj wpłatą'}
              <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
            </a>
          </>
        ) : (
          <p>
            {s.contactHint ??
              'Żeby zmienić lub anulować wpłatę, napisz do nas z adresu użytego przy wpłacie:'}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        )}

        {portalHref && (
          <p className="agreement">
            {s.contactFallback ?? 'Jeśli link nie dotrze, napisz do nas:'}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        )}
      </div>
    </main>
  );
}
