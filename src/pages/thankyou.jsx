// src/pages/ThankYou.jsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
//import '../style/thankyou.css';

const LOCALE_CACHE = new Map();

export default function ThankYou() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [t, setT] = useState({ thankyou: {} });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        if (LOCALE_CACHE.has(language)) {
          if (active) setT(LOCALE_CACHE.get(language));
        } else {
          const res = await fetch(`/locales/${language}.json`, { credentials: 'same-origin' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          LOCALE_CACHE.set(language, data);
          if (active) setT(data);
        }
      } catch (e) {
        console.error('ThankYou i18n error:', e);
        if (active) {
          setT({ thankyou: {} });
          setErr('Nie udało się wczytać treści.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [language]);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const handleShare = async (platform) => {
    const text = t.thankyou?.shareText || 'Wspieram Młodzieżowy Strajk Klimatyczny!';
    const url = shareUrl;

    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <main className="thankyou" aria-busy={loading ? 'true' : 'false'}>
      {loading && (
        <div className="loader" role="status" aria-live="polite" aria-busy="true">
          <span className="spinner" aria-hidden="true"/>
        </div>
      )}


      {!loading && !err && (
        <section className="thankyou-content" aria-labelledby="thankyou-title">

          <h1 id="thankyou-title">
            {t.thankyou?.title || 'Dziękujemy za wsparcie!'}
          </h1>
        <div className='thankyou'>
          <aside className="thankyou-message">
            <h3 className="share-title">
              {t.thankyou?.supportTitle || 'To ogromne wsparcie'}
            </h3>
            <p className="lead">
              {t.thankyou?.subtitle || 'Twoja darowizna ma ogromne znaczenie dla naszej działalności.'}
            </p>

            <div className="info-box">
              <p>
                {t.thankyou?.confirmation || 'Potwierdzenie płatności zostało wysłane na Twój adres email.'}
              </p>
            </div>

              {t.thankyou?.description?.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              )) || (
                <>
                  <p>Dzięki Tobie możemy kontynuować edukację klimatyczną w szkołach i organizować działania na rzecz klimatu.</p>
                  <p>Twoje wsparcie pomaga nam docierać do młodych ludzi i budować ruch na rzecz sprawiedliwości klimatycznej.</p>
                </>
              )}
          </aside>

          {/* Share Section */}
          <aside className="share-section">
            <h3 className="share-title">
              {t.thankyou?.shareTitle || 'Podziel się z innymi'}
            </h3>
            <p className="share-subtitle">
              {t.thankyou?.shareSubtitle || 'Pomóż nam dotrzeć do większej liczby osób'}
            </p>
            
            <div className="share-buttons">
              <button
                onClick={() => handleShare('facebook')}
                className="share-btn facebook"
                aria-label="Udostępnij na Facebooku"
              >
                <i className="bi bi-facebook" aria-hidden="true"></i>
                Facebook
              </button>
              
              <button
                onClick={() => handleShare('twitter')}
                className="share-btn twitter"
                aria-label="Udostępnij na Twitterze"
              >
                <i className="bi bi-twitter-x" aria-hidden="true"></i>
                Twitter
              </button>
              
              <button
                onClick={() => handleShare('linkedin')}
                className="share-btn linkedin"
                aria-label="Udostępnij na LinkedIn"
              >
                <i className="bi bi-linkedin" aria-hidden="true"></i>
                LinkedIn
              </button>
            </div>
          </aside>

          {/* Next Steps */}
          <aside className="next-steps">
            <h3>{t.thankyou?.nextSteps || 'Co dalej?'}</h3>
            <ul>
              <li>
                <i className="bi bi-check2" aria-hidden="true"></i>
                {t.thankyou?.step1 || 'Sprawdź swoją skrzynkę email - otrzymasz potwierdzenie płatności'}
              </li>
              <li>
                <i className="bi bi-check2" aria-hidden="true"></i>
                {t.thankyou?.step2 || 'Obserwuj nas w mediach społecznościowych'}
              </li>
              <li>
                <i className="bi bi-check2" aria-hidden="true"></i>
                {t.thankyou?.step3 || 'Zostań wolontariuszem lub dołącz do lokalnej grupy'}
              </li>
            </ul>
          </aside>
          </div>
        </section>
        
      )}
    </main>
  );
}