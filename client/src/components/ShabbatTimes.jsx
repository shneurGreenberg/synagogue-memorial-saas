import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import {
  fetchShabbatTimes,
  formatShabbatClockTime,
  getBoardTimezone,
  msUntilNextRefresh,
} from '../lib/shabbat-times';
import { backoffDelayMs, isBrowserOffline } from '../lib/network-backoff';
import { createHebrewDate, getHolidayName, getWeeklyParshaName, translateHolidayFromEnglish } from '../lib/weekly-parsha';
import { useBoardData } from '../context/BoardDataContext';

function ShabbatTimesInner({ t }) {
  const [times, setTimes] = useState(null);
  const { uiLang } = useBoardData();
  const hebrewDate = createHebrewDate();
  const parshaName = getWeeklyParshaName(hebrewDate, uiLang);
  const currentDayHolidayName = getHolidayName(hebrewDate, uiLang);
  
  const upcomingHolidayName = times?.holidayName 
    ? translateHolidayFromEnglish(times.holidayName, uiLang)
    : null;
  
  const weeklyLabel = upcomingHolidayName || currentDayHolidayName || parshaName;
  const showParshaHeading = Boolean(parshaName && !upcomingHolidayName && !currentDayHolidayName);

  useEffect(() => {
    let cancelled = false;
    let timeout;
    let failures = 0;
    let lastGood = null;

    // 1.30.1 I19: offline → keep the last good times on screen and retry with quiet backoff.
    async function load() {
      const data = getBoardData();
      const next = await fetchShabbatTimes(data);
      if (cancelled) {
        return;
      }
      window.clearTimeout(timeout);
      if (next) {
        failures = 0;
        lastGood = next;
        setTimes(next);
        timeout = window.setTimeout(load, msUntilNextRefresh(next));
        return;
      }
      failures += 1;
      timeout = window.setTimeout(load, Math.max(msUntilNextRefresh(lastGood), backoffDelayMs(failures - 1)));
    }

    load();
    const onOnline = () => { failures = 0; load(); };
    window.addEventListener('online', onOnline);
    const interval = window.setInterval(() => { if (!isBrowserOffline()) load(); }, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const timezone = getBoardTimezone(getBoardData());
  
  const enterLabel = times?.isHoliday ? t('holiday_enter') : t('shabbat_enter');
  const exitLabel = times?.isHoliday ? t('holiday_exit') : t('shabbat_exit');

  if (!weeklyLabel && !times) {
    return null;
  }

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
      {times && (
        <div className="shabbat-times-row" dir={uiLang === 'he' ? 'rtl' : undefined}>
          <div className="shabbat-times-item shabbat-enter">
            <span className="shabbat-label">{enterLabel}</span>
            <span className="shabbat-time">{formatShabbatClockTime(times.enter, timezone)}</span>
          </div>
          <div className="shabbat-times-item shabbat-exit">
            <span className="shabbat-label">{exitLabel}</span>
            <span className="shabbat-time">{formatShabbatClockTime(times.exit, timezone)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const ShabbatTimes = withTranslation()(ShabbatTimesInner);
