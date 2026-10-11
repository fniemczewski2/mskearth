import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';

import { useTranslations } from '../shared/i18n/useTranslations.js';
import { fetchClimateClock } from './climateClockApi.js';

const pad = (number, length) => String(number ?? 0).padStart(length, '0');

function Clock() {
  const { t } = useTranslations();
  const [now, setNow] = useState(() => DateTime.utc());
  const [deadline, setDeadline] = useState(null);

  useEffect(() => {
    let active = true;
    fetchClimateClock()
      .then((mods) => {
        const ts = mods?.carbon_deadline_1?.timestamp;
        if (active && ts) setDeadline(DateTime.fromISO(ts, { zone: 'utc' }));
      })
      .catch((err) => console.error('Clock API error:', err));

    const id = setInterval(() => setNow(DateTime.utc()), 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const remaining = deadline
    ? deadline.diff(now, ['years', 'days', 'hours', 'minutes', 'seconds']).toObject()
    : null;

  const clock = t.clock ?? {};

  return (
    <a
      className="clock"
      href="https://climateclock.world/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t.a11y?.openClock ?? 'Climate Clock'} ${t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}`}
    >
      {remaining && (
        <span aria-hidden="true">
          <span className="clock-title">
            <span>{clock.title || ''}</span>
          </span>
          <span className="clock-time">
            {remaining.years}
            <span>&nbsp;{clock.years || ''}&nbsp;</span>
            {pad(remaining.days, 3)}
            <span>&nbsp;{clock.days || ''}&nbsp;</span>
            <br />
            {pad(remaining.hours, 2)}
            <span>:</span>
            {pad(remaining.minutes, 2)}
            <span>:</span>
            {pad(Math.floor(remaining.seconds), 2)}
          </span>
        </span>
      )}
    </a>
  );
}

export default Clock;
