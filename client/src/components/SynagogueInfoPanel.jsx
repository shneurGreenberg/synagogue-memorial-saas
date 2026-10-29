import React, { useEffect, useRef, useState } from 'react';
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

// 1.29.5 I3: slowly auto-scroll a column only when its content overflows.
function useAutoScroll(ref, deps) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let dir = 1;
    let pauseUntil = Date.now() + 3000;
    el.scrollTop = 0;
    const id = window.setInterval(() => {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 2) {
        if (el.scrollTop) el.scrollTop = 0;
        return;
      }
      const now = Date.now();
      if (now < pauseUntil) return;
      el.scrollTop += dir;
      if (dir > 0 && el.scrollTop >= max - 1) { dir = -1; pauseUntil = now + 3000; }
      else if (dir < 0 && el.scrollTop <= 0) { dir = 1; pauseUntil = now + 3000; }
    }, 50);
    return () => window.clearInterval(id);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

function clampScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(250, Math.max(50, n)) / 100;
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
  const colRef = useRef(null);
  useAutoScroll(colRef, [prayers.length, data.combinedInfoScale]);
  const current = announcements.length ? announcements[slide % announcements.length] : null;

  return (
    <div
      className="synagogue-info-panel synagogue-info-panel--two-col"
      style={{
        '--combined-info-scale': clampScale(data.combinedInfoScale),
        '--combined-announcement-scale': clampScale(data.combinedAnnouncementScale),
      }}
    >
      <div className="synagogue-info-col synagogue-info-col--scroll" ref={colRef}>
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
                <dt dir="auto">{row.label}</dt>
                <dd>{row.time}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      </div>
      <section className="synagogue-info-block synagogue-info-announcements">
        <h2 className="synagogue-info-title" dir="auto">{t('announcements_title')}</h2>
        {current ? (
          <div className="synagogue-info-announcement-carousel" key={`${current.id}-${slide}`}>
            <div className="synagogue-info-announcement">
              <strong dir="auto">{current.title}</strong>
              {current.text && (
                <div dir="auto" dangerouslySetInnerHTML={{ __html: sanitizeRichText(current.text) }} />
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
