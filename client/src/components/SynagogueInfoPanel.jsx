import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import { getBoardLocation, formatShabbatClockTime } from '../lib/shabbat-times';
import { getGregorianDateInTimezone } from '../lib/board-calendar';
import { computeZmanim } from '../lib/zmanim';
import { sanitizeRichText } from '../lib/html-sanitize';

const ANNOUNCEMENT_ROTATE_MS = 8000;

function useMinuteTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  return tick;
}

function SynagogueInfoPanelInner({ t, communityEvents }) {
  useMinuteTick();
  const data = getBoardData();
  const loc = getBoardLocation(data);
  const today = getGregorianDateInTimezone(loc.timezone);
  const zmanim = computeZmanim({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
    lat: loc.lat,
    lng: loc.lng,
  });
  const prayers = (data.prayerTimes || []).filter((row) => row && row.label && row.time);
  const announcements = communityEvents || [];
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (announcements.length < 2) return undefined;
    const id = window.setInterval(() => setSlide((v) => v + 1), ANNOUNCEMENT_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [announcements.length]);
  const current = announcements.length ? announcements[slide % announcements.length] : null;

  return (
    <div className="synagogue-info-panel synagogue-info-panel--two-col">
      <div className="synagogue-info-col">
      <section className="synagogue-info-block synagogue-info-zmanim">
        <h2 className="synagogue-info-title">{t('zmanim_title')}</h2>
        <dl className="synagogue-info-list">
          {zmanim.map((row) => (
            <div className="synagogue-info-row" key={row.key}>
              <dt>{t(row.labelKey)}</dt>
              <dd>{formatShabbatClockTime(row.at, loc.timezone)}</dd>
            </div>
          ))}
        </dl>
      </section>
      {prayers.length > 0 && (
        <section className="synagogue-info-block synagogue-info-prayers">
          <h2 className="synagogue-info-title">{t('prayer_times_title')}</h2>
          <dl className="synagogue-info-list">
            {prayers.map((row, index) => (
              <div className="synagogue-info-row" key={`${row.label}-${index}`}>
                <dt>{row.label}</dt>
                <dd>{row.time}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      </div>
      <section className="synagogue-info-block synagogue-info-announcements">
        <h2 className="synagogue-info-title">{t('announcements_title')}</h2>
        {current ? (
          <div className="synagogue-info-announcement-carousel" key={`${current.id}-${slide}`}>
            <div className="synagogue-info-announcement">
              <strong>{current.title}</strong>
              {current.text && (
                <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(current.text) }} />
              )}
            </div>
            {announcements.length > 1 && (
              <div className="synagogue-info-dots" aria-hidden="true">
                {announcements.map((event, index) => (
                  <span key={event.id} className={index === slide % announcements.length ? 'is-active' : ''} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export const SynagogueInfoPanel = withTranslation()(SynagogueInfoPanelInner);
