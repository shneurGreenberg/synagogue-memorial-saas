import React, { useEffect, useState } from 'react';
import { fetchShabbatTimes, formatShabbatTime } from '../lib/shabbat';
import { getWeeklyParshaName } from '../lib/weekly-parsha';
import { t } from '../lib/i18n';

export function ShabbatBlock({ lat, long, timezone, hebrewDate, lang }) {
  const [times, setTimes] = useState(null);
  const parshaName = getWeeklyParshaName(hebrewDate, lang);

  useEffect(() => {
    let cancelled = false;

    const load = () => fetchShabbatTimes(lat, long, timezone)
      .then((next) => {
        if (!cancelled && next) {
          setTimes(next);
        }
      })
      .catch(() => {});

    load();

    const timer = window.setInterval(load, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [lat, long, timezone]);

  if (!parshaName && !times) {
    return null;
  }

  return (
    <div className="board-shabbat-block">
      <div className="shabbat-times">
        {parshaName && (
          <div className="shabbat-parsha-block">
            <span className="shabbat-parsha-heading">{t(lang, 'weekly_chapter')}</span>
            <span className="shabbat-parsha-name">{parshaName}</span>
          </div>
        )}
        {times && (
          <div className="shabbat-times-row">
            <div className="shabbat-times-item shabbat-enter">
              <span className="shabbat-label">{t(lang, 'shabbat_enter')}</span>
              <span className="shabbat-time">{formatShabbatTime(times.enter, timezone)}</span>
            </div>
            <div className="shabbat-times-item shabbat-exit">
              <span className="shabbat-label">{t(lang, 'shabbat_exit')}</span>
              <span className="shabbat-time">{formatShabbatTime(times.exit, timezone)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
