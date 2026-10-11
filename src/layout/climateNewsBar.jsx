import { useEffect, useRef, useState } from 'react';

import { useTranslations } from '../shared/i18n/useTranslations.js';
import { fetchClimateClock } from './climateClockApi.js';

const ABS_SPEED = 80;
const MIN_DURATION = 20;
const MAX_DURATION = 180;

function NewsGroup({ items, duplicate = false, groupRef }) {
  return (
    <div className="ticker-group" ref={groupRef} aria-hidden={duplicate || undefined}>
      {items.map((item, idx) => (
        <a
          key={`${idx}-${item?.headline?.slice(0, 24) || 'x'}`}
          href={item?.link || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="ticker-item"
          tabIndex={duplicate ? -1 : undefined}
        >
          {item?.headline}
        </a>
      ))}
    </div>
  );
}

export default function ClimateNewsBar() {
  const { t } = useTranslations();
  const [feed, setFeed] = useState([]);
  // Pasek przewija sie od razu; przycisk pozwala go zatrzymac (WCAG 2.2.2).
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetchClimateClock()
      .then((mods) => {
        const items = mods?.newsfeed_1?.newsfeed ?? [];
        if (active) setFeed(items.filter(Boolean));
      })
      .catch((err) => console.error('ClimateNewsBar fetch error:', err));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const trackEl = trackRef.current;
    const groupEl = groupRef.current;
    if (!trackEl || !groupEl || feed.length === 0) return undefined;

    const compute = () => {
      const groupWidth = Math.ceil(groupEl.getBoundingClientRect().width);
      if (!groupWidth) return;
      const seconds = Math.min(MAX_DURATION, Math.max(MIN_DURATION, groupWidth / ABS_SPEED));
      trackEl.style.setProperty('--duration', `${seconds}s`);
    };

    if (document?.fonts?.ready) document.fonts.ready.then(compute).catch(compute);
    else compute();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(compute);
    observer.observe(groupEl);
    return () => observer.disconnect();
  }, [feed]);

  if (feed.length === 0) return null;

  return (
    <div className={`ccw-ticker${paused ? ' is-paused' : ''}`}>
      <h2 className="sr-only">{t.a11y?.tickerHeading ?? 'Wiadomości klimatyczne'}</h2>
      <button
        type="button"
        className="ticker-toggle"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? (t.a11y?.playTicker ?? 'Wznów wiadomości') : (t.a11y?.pauseTicker ?? 'Zatrzymaj wiadomości')}
      >
        <i className={paused ? 'bi bi-play-fill' : 'bi bi-pause-fill'} aria-hidden="true" />
      </button>
      <div className="ticker-viewport">
        <div className="ticker-track" ref={trackRef}>
          <NewsGroup items={feed} groupRef={groupRef} />
          <NewsGroup items={feed} duplicate />
        </div>
      </div>
    </div>
  );
}
