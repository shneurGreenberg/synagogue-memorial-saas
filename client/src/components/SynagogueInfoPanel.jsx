import React, { useEffect, useRef, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import { getBoardLocation, formatShabbatClockTime } from '../lib/shabbat-times';
import { getGregorianDateInTimezone } from '../lib/board-calendar';
import { computeZmanim } from '../lib/zmanim';
import { sanitizeRichText } from '../lib/html-sanitize';
import { splitSectionHeights } from '../../../lib/split-section-heights';

const ANNOUNCEMENT_ROTATE_MS = 8000;
const LEGACY_RU_ZMANIM_TITLES = ['зманим на сегодня', 'зманим', 'зманим сегодня'];

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
      if (document.hidden) return;
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

// 1.30.0 I11: zmanim/prayers scroll as a seamless endless loop (like the other board scrollers).
// When the list overflows its box, a second copy is rendered right after the first one and the
// box scrolls down forever; once the first copy has fully passed we jump back by its height,
// which looks identical, so the motion never reverses.
// 1.38.0 I85: the copy height / gap used to be measured (getBoundingClientRect + getComputedStyle,
// i.e. a forced layout) on EVERY 25 ms step — with three loops since 1.37.0 that is ~120 forced
// layouts a second, which starves weak TV browsers over hours. Now they are measured once a
// second and the loop does nothing while the page is hidden.
export const LOOP_SCROLL_STEP_MS = 25;
export const LOOP_SCROLL_MEASURE_EVERY = 40;
export function useLoopScroll(ref, deps) {
  const [looping, setLooping] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let pos = 0;
    let pauseUntil = Date.now() + 3000;
    let ticks = 0;
    let copyHeight = 0;
    let gap = 0;
    let boxHeight = 0;
    el.scrollTop = 0;
    const measure = () => {
      const first = el.firstElementChild;
      if (!first) return false;
      copyHeight = first.getBoundingClientRect().height;
      gap = parseFloat(getComputedStyle(first).marginBottom) || 0;
      boxHeight = el.clientHeight;
      return true;
    };
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (ticks % LOOP_SCROLL_MEASURE_EVERY === 0 && !measure()) {
        ticks += 1;
        return;
      }
      ticks += 1;
      const overflow = copyHeight > boxHeight + 2;
      if (overflow !== looping) {
        setLooping(overflow);
        return;
      }
      if (!overflow) {
        if (el.scrollTop) el.scrollTop = 0;
        pos = 0;
        return;
      }
      if (Date.now() < pauseUntil) return;
      pos += 0.5;
      const period = copyHeight + gap;
      if (period > 0 && pos >= period) pos -= period;
      el.scrollTop = pos;
    }, LOOP_SCROLL_STEP_MS);
    return () => window.clearInterval(id);
  }, [...deps, looping]); // eslint-disable-line react-hooks/exhaustive-deps
  return looping;
}

// 1.37.0 I77: inside the prayers box, prayers and lessons are two parts that each scroll on their
// own. A part that fits keeps its natural height (no scrolling); an overflowing part gets the rest
// of the box and loops by itself. Part headings sit outside the scrolling area, so they never move.
function naturalPartHeight(part) {
  if (!part) return 0;
  let height = 0;
  Array.prototype.forEach.call(part.children, (child) => {
    if (child.classList && child.classList.contains('synagogue-info-box-scroll')) {
      const copy = child.firstElementChild;
      height += copy ? copy.getBoundingClientRect().height : 0;
    } else {
      height += child.getBoundingClientRect().height;
      const cs = window.getComputedStyle ? getComputedStyle(child) : null;
      if (cs) height += (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
    }
  });
  return Math.ceil(height);
}

function useSplitHeights(containerRef, partARef, partBRef, deps) {
  const [heights, setHeights] = useState({ a: null, b: null });
  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (!container || document.hidden) return;
      const next = splitSectionHeights(
        container.clientHeight,
        naturalPartHeight(partARef.current),
        naturalPartHeight(partBRef.current),
      );
      setHeights((prev) => (
        prev.a !== null && Math.abs((prev.a || 0) - (next.a || 0)) < 1 && Math.abs((prev.b || 0) - (next.b || 0)) < 1
          ? prev
          : next
      ));
    };
    measure();
    const id = window.setInterval(measure, 1000);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return heights;
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
  // 1.36.0 I62/I63: rows come in the admin's saved (dragged) order; 'heading' rows are small
  // sub-headings (e.g. a weekday) inside the lessons group and have no time.
  const allRows = (data.prayerTimes || []).filter((row) => row && row.label && (row.time || row.kind === 'heading'));
  // 1.32.0 I39: prayers first, then classes
  // 1.34.0 I46: the classes group gets its own heading (so the two groups are not one list)
  const prayerRows = allRows.filter((row) => row.kind !== 'class' && row.kind !== 'heading');
  const classRows = allRows.filter((row) => row.kind === 'class' || row.kind === 'heading');
  const prayers = prayerRows.concat(classRows);
  const titles = data.boardSectionTitles || {};
  // 1.37.0 I78: an old saved Russian default («Зманим на сегодня» / bare «Зманим») meant nothing to
  // people — show the explained label instead.
  const heading = (key, fallbackKey) => {
    const custom = String(titles[key] || '').trim();
    if (key === 'zmanim' && LEGACY_RU_ZMANIM_TITLES.includes(custom.toLowerCase())) return t(fallbackKey);
    return custom || t(fallbackKey);
  };
  // 1.34.0 I51: community messages have no heading at all any more.
  const announcements = communityEvents || [];
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (announcements.length < 2) return undefined;
    const id = window.setInterval(() => setSlide((v) => v + 1), ANNOUNCEMENT_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [announcements.length]);
  // 1.29.6: each box scrolls its own content (title + frame stay fixed).
  const zmanimRef = useRef(null);
  const prayersRef = useRef(null);
  const classesRef = useRef(null);
  const splitRef = useRef(null);
  const prayersPartRef = useRef(null);
  const classesPartRef = useRef(null);
  const announcementRef = useRef(null);
  const zmanimScale = data.combinedZmanimScale ?? data.combinedInfoScale;
  const prayersScale = data.combinedPrayersScale ?? data.combinedInfoScale;
  const zmanimLoop = useLoopScroll(zmanimRef, [zmanim.length, prayers.length, prayerRows.length, classRows.length, zmanimScale]);
  const prayersLoop = useLoopScroll(prayersRef, [prayers.length, prayerRows.length, classRows.length, prayersScale]);
  const classesLoop = useLoopScroll(classesRef, [prayers.length, prayerRows.length, classRows.length, prayersScale]);
  const split = useSplitHeights(splitRef, prayersPartRef, classesPartRef, [prayerRows.length, classRows.length, prayersScale]);
  const partStyle = (h) => (h === null || h === undefined ? undefined : { flex: `0 0 ${Math.max(0, Math.floor(h))}px`, height: `${Math.max(0, Math.floor(h))}px` });
  useAutoScroll(announcementRef, [slide, announcements.length, data.combinedAnnouncementScale]);
  const current = announcements.length ? announcements[slide % announcements.length] : null;

  return (
    <div
      className="synagogue-info-panel synagogue-info-panel--two-col"
      style={{
        '--combined-zmanim-scale': clampScale(zmanimScale),
        '--combined-prayers-scale': clampScale(prayersScale),
        '--combined-info-scale': clampScale(zmanimScale),
        '--combined-announcement-scale': clampScale(data.combinedAnnouncementScale),
      }}
    >
      <div className="synagogue-info-col synagogue-info-col--boxes synagogue-info-col--side-by-side">
      <section
        className="synagogue-info-block synagogue-info-zmanim"
        style={{ '--combined-info-scale': clampScale(zmanimScale) }}
      >
        <h2 className="synagogue-info-title">{heading('zmanim', 'zmanim_title')}</h2>
        <div className="synagogue-info-box-scroll synagogue-info-loop" ref={zmanimRef}>
          {(zmanimLoop ? ['a', 'b'] : ['a']).map((copy) => (
            <dl className="synagogue-info-list synagogue-info-loop-copy" key={copy} aria-hidden={copy === 'b' ? 'true' : undefined}>
              {zmanim.map((row) => (
                <div className="synagogue-info-row" key={row.key}>
                  <dt>{t(row.labelKey)}</dt>
                  <dd>{formatShabbatClockTime(row.at, loc.timezone)}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>
      </section>
      {prayers.length > 0 && (
        <section
          className="synagogue-info-block synagogue-info-prayers"
          style={{ '--combined-info-scale': clampScale(prayersScale) }}
        >
          <h2 className="synagogue-info-title" dir="auto">{heading('prayers', 'prayer_times_title')}</h2>
          <div className="synagogue-info-split" ref={splitRef}>
            {prayerRows.length > 0 && (
              <div className="synagogue-info-part synagogue-info-part--prayers" ref={prayersPartRef} style={partStyle(split.a)}>
                <div className="synagogue-info-box-scroll synagogue-info-loop" ref={prayersRef}>
                  {(prayersLoop ? ['a', 'b'] : ['a']).map((copy) => (
                    <dl className="synagogue-info-list synagogue-info-loop-copy" key={copy} aria-hidden={copy === 'b' ? 'true' : undefined}>
                      {prayerRows.map((row, index) => (
                        <div className="synagogue-info-row synagogue-info-row--prayer" key={`prayer-${row.label}-${index}`}>
                          <dt dir="auto">{row.label}</dt>
                          <dd>{row.time}</dd>
                        </div>
                      ))}
                    </dl>
                  ))}
                </div>
              </div>
            )}
            {classRows.length > 0 && (
              <div className="synagogue-info-part synagogue-info-part--classes" ref={classesPartRef} style={partStyle(split.b)}>
                <div className="synagogue-info-group-title" dir="auto">{heading('classes', 'classes_title')}</div>
                <div className="synagogue-info-box-scroll synagogue-info-loop" ref={classesRef}>
                  {(classesLoop ? ['a', 'b'] : ['a']).map((copy) => (
                    <dl className="synagogue-info-list synagogue-info-loop-copy" key={copy} aria-hidden={copy === 'b' ? 'true' : undefined}>
                      {classRows.map((row, index) => (row.kind === 'heading' ? (
                        <div className="synagogue-info-subheading" dir="auto" key={`heading-${row.label}-${index}`}>
                          {row.label}
                        </div>
                      ) : (
                        <div className="synagogue-info-row synagogue-info-row--class" key={`class-${row.label}-${index}`}>
                          <dt dir="auto">{row.label}</dt>
                          <dd>{row.time}</dd>
                        </div>
                      )))}
                    </dl>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      </div>
      <section className="synagogue-info-block synagogue-info-announcements synagogue-info-announcements--untitled">
        {current ? (
          <div className="synagogue-info-announcement-carousel" key={`${current.id}-${slide}`}>
            <div className="synagogue-info-announcement synagogue-info-box-scroll" ref={announcementRef}>
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
