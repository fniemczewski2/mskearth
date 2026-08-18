import { useState, useEffect, useRef } from 'react';

const API_URL = 'https://api.climateclock.world/v2/widget/clock.json';
const ABS_SPEED = 80;
const MIN_DURATION = 20;
const MAX_DURATION = 180;

const ClimateNewsBar = () => {
  const [feed, setFeed] = useState([]);
  const trackRef = useRef(null);
  const groupRef = useRef(null); 

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const fetchWithRetry = async (attempt = 0) => {
      try {
        const res = await fetch(API_URL, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = data?.data?.modules?.newsfeed_1?.newsfeed ?? [];
        if (!cancelled) setFeed(items.filter(Boolean));
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        if (attempt < 2) {
          setTimeout(() => fetchWithRetry(attempt + 1), 2 ** attempt * 1000);
        } else {
          console.error('ClimateNewsBar fetch error:', err);
          setFeed([]);
        }
      }
    };

    fetchWithRetry();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const trackEl = trackRef.current;
    const groupEl = groupRef.current;
    if (!trackEl || !groupEl || feed.length === 0) return;

    const compute = () => {
      const groupWidth = Math.ceil(groupEl.getBoundingClientRect().width);
      if (!groupWidth) return;

      trackEl.style.setProperty('--ticker-distance', `${-groupWidth}px`);

      const durationSec = Math.min(
        MAX_DURATION,
        Math.max(MIN_DURATION, groupWidth / ABS_SPEED)
      );
      trackEl.style.setProperty('--duration', `${durationSec}s`);
    };

    if (document?.fonts?.ready) {
      document.fonts.ready.then(compute).catch(compute);
    } else {
      setTimeout(compute, 0);
    }

    const ro = new ResizeObserver(compute);
    ro.observe(groupEl);
    window.addEventListener('resize', compute, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [feed]);

  if (feed.length === 0) return null;

  const Group = ({ ariaHidden = false }) => (
    <div className="ticker-group" aria-hidden={ariaHidden || undefined}>
      {feed.map((item, idx) => (
        <a
          key={`news-${idx}-${item?.headline?.slice(0, 24) || 'x'}`}
          href={item?.link || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="ticker-item"
        >
          {item?.headline}
        </a>
      ))}
    </div>
  );

  return (
    <div className="ccw-ticker" aria-label="Wiadomości klimatyczne">
      <div className="ticker-track" ref={trackRef}>
        <div ref={groupRef}><Group /></div>
        <Group ariaHidden />
      </div>
    </div>
  );
};

export default ClimateNewsBar;
