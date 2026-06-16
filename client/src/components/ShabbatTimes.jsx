import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import {
  fetchShabbatTimes,
  formatShabbatClockTime,
  getBoardTimezone,
  msUntilNextRefresh,
} from '../lib/shabbat-times';
import { createHebrewDate, getHolidayName, getWeeklyParshaName } from '../lib/weekly-parsha';
import { useBoardData } from '../context/BoardDataContext';

function ShabbatTimesInner({ t }) {
  const [times, setTimes] = useState(null);
  const { uiLang } = useBoardData();
  const hebrewDate = createHebrewDate();
  const parshaName = getWeeklyParshaName(hebrewDate, uiLang);
  const holidayName = getHolidayName(hebrewDate, uiLang);

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
  const weeklyLabel = holidayName || parshaName;
  const showParshaHeading = Boolean(parshaName && !holidayName);

  return (
    <div className="shabbat-times">
      {weeklyLabel && (
        <div className="shabbat-parsha-block">
          {showParshaHeading && (
            <span className="shabbat-parsha-heading">{t('weekly_chapter')}</span>
          )}
          <span className="shabbat-parsha-name">{weeklyLabel}</span>
        </div>
      )}
      <div className="shabbat-times-row">
        <div className="shabbat-times-item shabbat-enter">
          <span className="shabbat-label">{t('shabbat_enter_short')}</span>
          <span className="shabbat-time">{formatShabbatClockTime(times.enter, timezone)}</span>
        </div>
        <div className="shabbat-times-sep" aria-hidden="true" />
        <div className="shabbat-times-item shabbat-exit">
          <span className="shabbat-label">{t('shabbat_exit_short')}</span>
          <span className="shabbat-time">{formatShabbatClockTime(times.exit, timezone)}</span>
        </div>
      </div>
    </div>
  );
}

export const ShabbatTimes = withTranslation()(ShabbatTimesInner);
