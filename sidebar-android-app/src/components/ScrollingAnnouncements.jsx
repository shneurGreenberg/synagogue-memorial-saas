import React, { useEffect, useRef, useState } from 'react';
import { formatHolidayDate } from '../lib/announcements';
import {
  formatEventGregorianDate,
  formatEventHebrewDate,
} from '../lib/dates';

function renderItem(item, lang, suffix, formatters) {
  if (item.listType === 'holiday') {
    return (
      <li key={`${item.id}${suffix}`} className="sidebar-holiday-item">
        <div className="sidebar-holiday-link">
          <time>{formatHolidayDate(item.date, lang)}</time>
          <span className="sidebar-holiday-title">{item.title}</span>
        </div>
      </li>
    );
  }

  if (item.listType === 'chabad') {
    return (
      <li key={`${item.id}${suffix}`} className="sidebar-chabad-item">
        <div className="sidebar-chabad-link">
          <time>{formatHolidayDate(item.date, lang)}</time>
          <span className="sidebar-chabad-title">{item.title}</span>
        </div>
      </li>
    );
  }

  return (
    <li key={`${item.id}${suffix}`} className="community-event-item">
      <div className="community-event-link">
        {item.eventDate && (
          <time>
            {formatEventGregorianDate(item.eventDate, lang)}
            {' / '}
            {formatEventHebrewDate(item.eventDate)}
          </time>
        )}
        <span className="community-event-title">{item.title}</span>
        {item.text && <span className="community-event-text">{item.text}</span>}
      </div>
    </li>
  );
}

export function ScrollingAnnouncements({ items, lang, title }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [durationSec, setDurationSec] = useState(120);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return undefined;

    const measure = () => {
      const contentHeight = shouldScroll ? track.scrollHeight / 2 : track.scrollHeight;
      if (contentHeight <= viewport.clientHeight + 4) {
        setShouldScroll(false);
        return;
      }

      const nextDuration = Math.max(contentHeight / 18, 90);
      setShouldScroll(true);
      setDurationSec(nextDuration);
    };

    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [items, shouldScroll]);

  if (!items.length) {
    return null;
  }

  return (
    <nav className="nearest-dates nearest-dates--divider-top" aria-label={title}>
      <h2>{title}</h2>
      <div className="nearest-dates-scroll" ref={viewportRef}>
        <ul
          className={`nearest-dates-track${shouldScroll ? ' is-scrolling' : ''}`}
          ref={trackRef}
          style={shouldScroll ? { animationDuration: `${durationSec}s` } : undefined}
        >
          {items.map((item) => renderItem(item, lang, '', {}))}
          {shouldScroll && items.map((item) => renderItem(item, lang, '-dup', {}))}
        </ul>
      </div>
    </nav>
  );
}
