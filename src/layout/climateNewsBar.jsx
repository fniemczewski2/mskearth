import { useState, useEffect, useRef } from 'react';

const API_URL = 'https://api.climateclock.world/v2/widget/clock.json';
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
      const seconds = Math.min(MAX_DURATION, Math.max(MIN_DURATION, groupWidth / ABS_SPEED));
      trackEl.style.setProperty('--duration', `${seconds}s`);
    };

    if (document?.fonts?.ready) {
      document.fonts.ready.then(compute).catch(compute);
    } else {
      compute();
    }

    const observer = new ResizeObserver(compute);
    observer.observe(groupEl);

    return () => observer.disconnect();
  }, [feed]);

  if (feed.length === 0) return null;

  return (
    <div className="ccw-ticker">
      <h2 className="sr-only">Wiadomości klimatyczne</h2>
      <div className="ticker-track" ref={trackRef}>
        <NewsGroup items={feed} groupRef={groupRef} />
        <NewsGroup items={feed} duplicate />
      </div>
    </div>
  );
}
