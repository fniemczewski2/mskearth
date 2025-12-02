import { useState, useEffect, useCallback } from 'react';
import { DateTime, Settings } from 'luxon';

Settings.defaultZone = 'utc';

function Clock() {
  const [now, setNow] = useState(DateTime.utc());
  const [deadline, setDeadline] = useState(null);
  const [modules, setModules] = useState(null);
  const [translations, setTranslations] = useState({
    clock: { title: '', years: '', days: '' },
  });
  const [language, setLanguage] = useState(() => getLangFromPath());

  function getLangFromPath() {
    return (window.location.pathname.split('/')[1] || 'pl').toLowerCase();
  }

  const pad = (number, length) => String(number ?? 0).padStart(length, '0');

  const handleClockClick = () => {
    window.open('https://climateclock.world/', '_blank', 'noopener,noreferrer');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClockClick();
    }
  };

  useEffect(() => {
    const wrapHistory = (type) => {
      const orig = history[type];
      return function (...args) {
        const ret = orig.apply(this, args);
        window.dispatchEvent(new Event('locationchange'));
        return ret;
      };
    };
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    history.pushState = wrapHistory('pushState');
    history.replaceState = wrapHistory('replaceState');

    const onLocationChange = () => {
      const lang = getLangFromPath();
      setLanguage(lang);
    };
    window.addEventListener('locationchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);

    onLocationChange();

    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      window.removeEventListener('locationchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/locales/${language}.json?_=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setTranslations(data || { clock: {} });
      } catch (err) {
        console.error('Error loading translations:', err);
        if (!cancelled) {
          setTranslations({
            clock: {
              title: 'Ziemia ociepli się o 1,5°C za:',
              years: 'lata',
              days: 'dni',
            },
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  const fetchModules = useCallback(() => {
    fetch('https://api.climateclock.world/v2/widget/clock.json')
      .then((res) => res.json())
      .then((data) => {
        const mods = data?.data?.modules;
        if (!mods) return;
        setModules(mods);
        const ts = mods.carbon_deadline_1?.timestamp;
        if (ts) setDeadline(DateTime.fromISO(ts));
      })
      .catch((err) => {
        console.error('Clock API error:', err);
      });
  }, []);

  useEffect(() => {
    fetchModules();
    const clockInterval = setInterval(() => {
      setNow(DateTime.utc());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [fetchModules]);

  const remaining = deadline
    ? deadline.diff(now, ['years', 'days', 'hours', 'minutes', 'seconds']).toObject()
    : null;

  return (
    <div
      className="clock"
      onClick={handleClockClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Otwórz Climate Clock"
    >
      {remaining && modules && (
        <>
          <div className="clock-title">
            <span>{translations.clock?.title || ''}</span>
          </div>
          <div className="clock-time">
            {remaining.years}
            <span>&nbsp;{translations.clock?.years || ''}&nbsp;</span>
            {pad(remaining.days, 3)}
            <span>&nbsp;{translations.clock?.days || ''}&nbsp;</span>
            <br/>
            {pad(remaining.hours, 2)}
            <span>:</span>
            {pad(remaining.minutes, 2)}
            <span>:</span>
            {pad(Math.floor(remaining.seconds), 2)}
          </div>
        </>
      )}
    </div>
  );
}

export default Clock;
