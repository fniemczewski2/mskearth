import { useEffect, useRef, useState } from 'react';

import Clock from '../../layout/clock.jsx';
import JoinUs from '../recruitment/joinUs.jsx';
import Donate from '../donate/donate.jsx';
import NewsletterForm from '../newsletter/newsletter.jsx';
import Seo from '../../shared/components/Seo.jsx';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { SITE_URL } from '../../shared/config/site.js';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function Main() {
  const { t, lang } = useTranslations();
  const h = t.home ?? {};
  const videoRef = useRef(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  // Uzytkownik moze zatrzymac film (WCAG 2.2.2); przy ograniczonym ruchu nie startuje sam.
  const [userPaused, setUserPaused] = useState(() => prefersReducedMotion());
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !('IntersectionObserver' in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = entry.isIntersecting && entry.intersectionRatio > 0;
        if (visible && !userPaused) v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: '0px 0px -10% 0px', threshold: [0, 0.1, 0.5] }
    );
    observer.observe(v);
    return () => observer.disconnect();
  }, [userPaused]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onVolume = () => setIsMuted(v.muted);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener('volumechange', onVolume);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('volumechange', onVolume);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      setUserPaused(false);
      v.play().catch(() => {});
    } else {
      setUserPaused(true);
      v.pause();
    }
  };

  const h1 = Array.isArray(h.h1) ? h.h1 : ['Młodzieżowy', 'Strajk', 'Klimatyczny'];

  return (
    <main className="index">
      <Seo
        title={t.seo?.home?.title ?? 'Młodzieżowy Strajk Klimatyczny – Fridays for Future Polska'}
        description={t.seo?.home?.description}
        url={`${SITE_URL}/${lang}`}
      />
      <Clock />

      <section className="hero">
        <h1>
          {h1.map((word, i) => (
            <span key={word}>
              {word}
              {i < h1.length - 1 && <br />}
            </span>
          ))}
        </h1>

        <div className="hero-cta-group">
          <a href="#joinUs" className="cta">
            {h.join ?? 'Dołącz do nas'}&nbsp;<i className="bi bi-rocket-takeoff" aria-hidden="true" />
          </a>
          <a href="#donate" className="cta ghost">
            {h.support ?? 'Wesprzyj nas'}&nbsp;<i className="bi bi-piggy-bank" aria-hidden="true" />
          </a>
        </div>

        <i className="bi bi-chevron-double-down scroll-cue" aria-hidden="true" />
      </section>

      <section className="film-container" data-reveal>
        <video
          id="film"
          className="film"
          ref={videoRef}
          muted={isMuted}
          loop
          playsInline
          preload="metadata"
          poster="/filmikea-poster.webp"
          width="1280"
          height="720"
          onCanPlayThrough={() => setIsLoading(false)}
          onLoadedData={() => setIsLoading(false)}
          aria-label={h.videoLabel ?? 'Film'}
        >
          <source src="/filmikea.webm" type="video/webm" />
          {h.videoFallback ?? 'Twoja przeglądarka nie obsługuje elementu wideo.'}
        </video>

        {isLoading && !userPaused && (
          <div className="loader" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
          </div>
        )}

        <div className="film-controls">
          <button
            type="button"
            className="mute-button"
            onClick={togglePlay}
            aria-label={isPlaying ? (h.pause ?? 'Zatrzymaj wideo') : (h.play ?? 'Odtwórz wideo')}
          >
            <i className={isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill'} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mute-button"
            onClick={toggleMute}
            aria-label={isMuted ? (h.mute ?? 'Włącz dźwięk') : (h.unmute ?? 'Wycisz wideo')}
          >
            <i className={isMuted ? 'bi bi-volume-mute' : 'bi bi-volume-up'} aria-hidden="true" />
          </button>
        </div>
      </section>

      <div id="joinUs">
        <JoinUs />
      </div>
      <div id="donate">
        <Donate />
      </div>
      <div id="newsletter">
        <NewsletterForm />
      </div>
    </main>
  );
}

export default Main;
