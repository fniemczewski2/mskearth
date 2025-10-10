import { useState, useEffect, useCallback, useRef } from 'react';
import '../style/climateNewsBar.css';

const API_URL = 'https://api.climateclock.world/v2/widget/clock.json';
const ABS_SPEED = 80; // px per second (tweak to taste)
const MIN_DURATION = 20;
const MAX_DURATION = 180;

const ClimateNewsBar = () => {
  const [feed, setFeed] = useState([]);
  const trackRef = useRef(null);
  const groupRef = useRef(null); // first (measured) group

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const modules = data?.data?.modules;
      const items = modules?.newsfeed_1?.newsfeed ?? [];
      setFeed(items.filter(Boolean));
    } catch (err) {
      console.error('ClimateNewsBar fetch error:', err);
      setFeed([]);
    }
  }, []);

  // initial fetch
  useEffect(() => { fetchModules(); }, [fetchModules]);

  // recalc animation distance & duration
  useEffect(() => {
    const trackEl = trackRef.current;
    const groupEl = groupRef.current;
    if (!trackEl || !groupEl || feed.length === 0) return;

    const compute = () => {
      // width of ONE full set (the second copy is just for looping)
      const groupWidth = Math.ceil(groupEl.getBoundingClientRect().width);
      if (!groupWidth) return;

      // move by exactly one group's width
      trackEl.style.setProperty('--ticker-distance', `${-groupWidth}px`);

      // keep absolute speed roughly constant, clamp to sane bounds
      const durationSec = Math.min(
        MAX_DURATION,
        Math.max(MIN_DURATION, groupWidth / ABS_SPEED)
      );
      trackEl.style.setProperty('--duration', `${durationSec}s`);
    };

    // compute after fonts are ready (important for clamp()/webfonts)
    if (document?.fonts?.ready) {
      document.fonts.ready.then(compute).catch(compute);
    } else {
      // fallback
      setTimeout(compute, 0);
    }

    // recompute on resize / content changes
    const ro = new ResizeObserver(compute);
    ro.observe(groupEl);
    window.addEventListener('resize', compute, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [feed]);

  if (feed.length === 0) return null;

  // render a single group once, then clone it for seamless loop
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
