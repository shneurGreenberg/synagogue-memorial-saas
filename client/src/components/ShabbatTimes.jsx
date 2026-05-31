import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import {
  fetchShabbatTimes,
  formatShabbatClockTime,
  getBoardTimezone,
  msUntilNextRefresh,
} from '../lib/shabbat-times';

function ShabbatTimesInner({ t }) {
  const [times, setTimes] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timeout;

    async function load() {
      const data = getBoardData();
      const next = await fetchShabbatTimes(data);
      if (cancelled) {
        return;
      }
      setTimes(next);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(load, msUntilNextRefresh(next));
    }

    load();
    const interval = window.setInterval(load, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!times) {
    return null;
  }

  const timezone = getBoardTimezone(getBoardData());

  return (
    <div className="shabbat-times">
      <div className="shabbat-times-row">
        <div className="shabbat-times-item">
          <span className="shabbat-label">{t('shabbat_enter')}</span>
          <span className="shabbat-time">{formatShabbatClockTime(times.enter, timezone)}</span>
        </div>
        <div className="shabbat-times-item">
          <span className="shabbat-label">{t('shabbat_exit')}</span>
          <span className="shabbat-time">{formatShabbatClockTime(times.exit, timezone)}</span>
        </div>
      </div>
    </div>
  );
}

export const ShabbatTimes = withTranslation()(ShabbatTimesInner);
