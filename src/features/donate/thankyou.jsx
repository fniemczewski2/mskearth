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
      <Seo title={t.seo?.thankyou?.title ?? 'Dziękujemy za wsparcie – MSK'} noindex />

      <section className="thankyou-content" aria-labelledby="thankyou-title">
        <i className="bi bi-heart-fill emptyStateIcon" aria-hidden="true" style={{ color: 'var(--purple)' }} />
        <h1 id="thankyou-title">{ty.title || 'Dziękujemy za wsparcie!'}</h1>

        <div className="thankyou">
          <aside className="thankyou-message">
            <h3 className="share-title">{ty.supportTitle || 'To ogromne wsparcie'}</h3>
            <p className="lead">
              {ty.subtitle || 'Twoja darowizna ma ogromne znaczenie dla naszej działalności.'}
            </p>

            <div className="info-box">
              <p>
                {ty.confirmation ||
                  'Gdy płatność zostanie zaksięgowana, Stripe wyśle potwierdzenie na Twój adres e-mail.'}
              </p>
            </div>

            {description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </aside>

          <aside className="share-section">
            <h3 className="share-title">{ty.shareTitle || 'Podziel się z innymi'}</h3>
            <p className="share-subtitle">{ty.shareSubtitle || 'Pomóż nam dotrzeć do większej liczby osób'}</p>

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
          </aside>

          <aside className="next-steps">
            <h3>{ty.nextSteps || 'Co dalej?'}</h3>
            <ul>
              {[ty.step1, ty.step2, ty.step3].map((step, i) => (
                <li key={i}>
                  <i className="bi bi-check2" aria-hidden="true" />
                  {step ||
                    [
                      'Sprawdź skrzynkę e-mail – wyślemy tam potwierdzenie płatności',
                      'Obserwuj nas w mediach społecznościowych',
                      'Zostań wolontariuszem lub dołącz do lokalnej grupy',
                    ][i]}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
