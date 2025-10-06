import { useState, useEffect, useCallback, useRef } from 'react';
import '../style/climateNewsBar.css';

const API_URL = 'https://api.climateclock.world/v2/widget/clock.json';

const ClimateNewsBar = () => {
  const [feed, setFeed] = useState([]);
  const trackRef = useRef(null);

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
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

  useEffect(() => { fetchModules(); }, [fetchModules]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || feed.length === 0) return;

    const distance = -(el.scrollWidth / 2); // tylko połowa, bo dublujemy treść
    const ABS_SPEED = 80; // px/s
    const durationSec = Math.min(180, Math.max(20, Math.abs(distance) / ABS_SPEED));

    el.style.setProperty('--ticker-distance', `${distance}px`);
    el.style.setProperty('--duration', `${durationSec}s`);
  }, [feed]);

  if (feed.length === 0) return null;

  // zdubluj feed → <div> z newsami x2
  const doubledFeed = [...feed, ...feed];

  return (
    <div className="ccw-ticker" aria-label="Wiadomości klimatyczne">
      <div className="ticker-track" ref={trackRef}>
        {doubledFeed.map((item, idx) => (
          <a
            key={`${idx}-${item?.headline?.slice(0, 20)}`}
            href={item?.link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="ticker-item"
          >
            {item?.headline}
          </a>
        ))}
      </div>
    </div>
  );
};

export default ClimateNewsBar;
