import React, { useCallback, useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import {
  formatShabbatClockTime,
  getBoardTimezone,
  getDisplayedShabbatTimes,
  msUntilNextRefresh,
} from '../lib/shabbat-times';

function ShabbatTimesInner({ t }) {
  const [times, setTimes] = useState(() => getDisplayedShabbatTimes());

  const refresh = useCallback(() => {
    setTimes(getDisplayedShabbatTimes());
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60 * 1000);

    let timeout;
    const schedule = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextRefresh());
    };
    schedule();

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [refresh]);

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
