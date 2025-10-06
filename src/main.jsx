import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import filmIKEA from './assets/filmikea.webm';
import './style/main.css';
import Clock from './services/clock.jsx';

const JoinUs = lazy(() => import('./pages/joinUs.jsx'));
const Donate = lazy(() => import('./pages/donate.jsx'));

function Main() {
  const videoRef = useRef(null);
  const observerRef = useRef(null);

  const [isMuted, setIsMuted] = useState(true);   // start muted for autoplay policies
  const [isLoading, setIsLoading] = useState(true);
  const [isInView, setIsInView] = useState(true); // default true so SSR/older browsers still play

  // initial PRM
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // respond to PRM changes live
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => {
      const v = videoRef.current;
      if (!v) return;
      if (e.matches) {
        v.pause();
        v.removeAttribute('loop');
      } else {
        v.setAttribute('loop', '');
        if (isInView) v.play().catch(() => {});
      }
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [isInView]);

  // pause when tab is hidden
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onVis = () => {
      if (document.hidden) v.pause();
      else if (!prefersReducedMotion && isInView) v.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [prefersReducedMotion, isInView]);

  // lazy-play only when hero video is in view
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !('IntersectionObserver' in window)) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = entry.isIntersecting || entry.intersectionRatio > 0;
        setIsInView(visible);
        if (visible && !prefersReducedMotion) v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: '0px 0px -20% 0px', threshold: [0, 0.1, 0.5] }
    );
    observerRef.current.observe(v);
    return () => observerRef.current?.disconnect();
  }, [prefersReducedMotion]);

  // keep React state in sync if something external changes mute
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleVolumeChange = () => setIsMuted(v.muted);
    v.addEventListener('volumechange', handleVolumeChange);
    return () => v.removeEventListener('volumechange', handleVolumeChange);
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  return (
    <main className="index">
      <Clock />

      <section className="hero">
        <h1>Młodzieżowy Strajk Klimatyczny</h1>
      </section>

      <section className="film-container">
        <video
          id="film"
          className="film"
          ref={videoRef}
          autoPlay
          muted={isMuted}
          loop={!prefersReducedMotion}
          playsInline
          preload="metadata"
          onCanPlayThrough={() => setIsLoading(false)}
          onLoadedData={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          aria-hidden="true"  /* change to aria-label if the video is meaningful content */
        >
          <source src={filmIKEA} type="video/webm" />
          Twoja przeglądarka nie obsługuje elementu wideo.
        </video>

        {isLoading && (
          <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
            <span className="spinner" aria-hidden="true"/>
          </div>
        )}

        <div className="film-controls">
          <button
            type="button"
            className="mute-button"
            onClick={toggleMute}
            aria-pressed={!isMuted}
            aria-label={isMuted ? 'Włącz dźwięk' : 'Wycisz wideo'}
          >
            {isMuted
              ? <i className="bi bi-volume-mute" aria-hidden="true" />
              : <i className="bi bi-volume-up" aria-hidden="true" />}
          </button>
        </div>
      </section>

      <Suspense>
        <JoinUs />
        <Donate />
      </Suspense>
    </main>
  );
}

export default Main;
