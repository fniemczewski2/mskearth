import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Seo from '../../shared/components/Seo.jsx';
import { format, useTranslations } from '../../shared/i18n/useTranslations.js';
import { SITE_URL } from '../../shared/config/site.js';

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: 'bi-facebook' },
  { id: 'x', name: 'X', icon: 'bi-twitter-x' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'bi-linkedin' },
];

export default function ThankYou() {
  const { t, lang, ready } = useTranslations();
  const ty = t.thankyou ?? {};
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const isRecurring = params.get('typ') === 'cykliczna' && Boolean(sessionId);
  const [portal, setPortal] = useState({ busy: false, error: '' });

  // Bez webhooka wplate ksieguje to wywolanie: serwer pobiera stan sesji ze Stripe i zapisuje go w bazie.
  useEffect(() => {
    if (!sessionId) return;
    fetch('/api/checkout-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch((err) => console.error('Checkout confirm error:', err));
  }, [sessionId]);

  // Link z potwierdzenia otwiera portal Stripe bez logowania; serwer sprawdza sesje i jej wiek.
  const openPortal = async () => {
    if (portal.busy) return;
    setPortal({ busy: true, error: '' });
    try {
      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, locale: lang, returnHost: window.location.hostname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url)
        throw new Error(data.error ?? ty.manageFailed ?? 'Nie udało się otworzyć panelu.');
      window.location.assign(data.url);
    } catch (err) {
      setPortal({ busy: false, error: err.message });
    }
  };

  const handleShare = (platform) => {
    const text = ty.shareText || 'Wspieram Młodzieżowy Strajk Klimatyczny!';
    const url = `${SITE_URL}/${lang}`;

    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    if (urls[platform]) window.open(urls[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const description = Array.isArray(ty.description)
    ? ty.description
    : [
        'Dzięki Tobie możemy kontynuować edukację klimatyczną w szkołach i organizować działania na rzecz klimatu.',
        'Twoje wsparcie pomaga nam docierać do młodych ludzi i budować ruch na rzecz sprawiedliwości klimatycznej.',
      ];

  return (
    <main className="thankyou" aria-busy={ready ? 'false' : 'true'}>
      <Seo title={t.seo?.thankyou?.title ?? 'Dziękujemy za wsparcie - MSK'} noindex />

      <section className="thankyou-content" aria-labelledby="thankyou-title">
        <i className="bi bi-heart-fill emptyStateIcon emptyStateIcon--accent" aria-hidden="true" />
        <h1 id="thankyou-title">{ty.title || 'Dziękujemy za wsparcie!'}</h1>

        <div className="thankyou">
          <section className="thankyou-message">
            <h2 className="share-title">{ty.supportTitle || 'To ogromne wsparcie'}</h2>
            <p className="lead">
              {ty.subtitle || 'Twoja darowizna ma ogromne znaczenie dla naszej działalności.'}
            </p>

            <div className="info-box">
              <p>
                {ty.confirmation ||
                  'Gdy płatność zostanie zaksięgowana, Stripe wyśle potwierdzenie na Twój adres e-mail.'}
              </p>
            </div>

            {isRecurring && (
              <div className="info-box">
                <p>{ty.manageHint ?? 'Wpłatę cykliczną możesz w każdej chwili zmienić lub anulować.'}</p>
                <button
                  type="button"
                  className="primaryBtn"
                  onClick={openPortal}
                  aria-disabled={portal.busy ? 'true' : 'false'}
                >
                  {portal.busy
                    ? (ty.managePending ?? 'Otwieranie…')
                    : (ty.manageCta ?? 'Zarządzaj wpłatą cykliczną')}
                </button>
                {portal.error && (
                  <p className="formError formError--spaced" role="alert">
                    {portal.error}{' '}
                    <Link to={`/${lang}/subskrypcja`}>{ty.manageLink ?? 'Strona wpłaty cyklicznej'}</Link>
                  </p>
                )}
              </div>
            )}

            {description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>

          <section className="share-section">
            <h2 className="share-title">{ty.shareTitle || 'Podziel się z innymi'}</h2>
            <p className="share-subtitle">
              {ty.shareSubtitle || 'Pomóż nam dotrzeć do większej liczby osób'}
            </p>

            <div className="share-buttons">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleShare(p.id)}
                  className={`share-btn ${p.id === 'x' ? 'twitter' : p.id}`}
                  aria-label={format(ty.shareOn ?? 'Udostępnij na {platform}', { platform: p.name })}
                >
                  <i className={`bi ${p.icon}`} aria-hidden="true" />
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <section className="next-steps">
            <h2>{ty.nextSteps || 'Co dalej?'}</h2>
            <ul>
              {[ty.step1, ty.step2, ty.step3].map((step, i) => (
                <li key={i}>
                  <i className="bi bi-check2" aria-hidden="true" />
                  {step ||
                    [
                      'Sprawdź skrzynkę e-mail - wyślemy tam potwierdzenie płatności',
                      'Obserwuj nas w mediach społecznościowych',
                      'Zostań wolontariuszem lub dołącz do lokalnej grupy',
                    ][i]}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
