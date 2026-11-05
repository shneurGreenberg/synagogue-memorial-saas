import {
  getDatePartsInTimezone as sharedGetDateParts,
  getGregorianDateInTimezone as sharedGetGregorian,
  getHebrewDateInTimezone as sharedGetHebrew,
  getCivilDayKeyInTimezone,
  getCalendarDayKey as sharedGetCalendarDayKey,
  msUntilNextMidnight as sharedMsUntilMidnight,
  msUntilNextDayBoundary as sharedMsUntilBoundary,
} from '../../../lib/hebrew-day-boundary';
import { resolveBoardTimezone } from './timezone';
import { getBoardData } from './board-data';
import { getBoardLocation } from './shabbat-times';
import { resolveBoardCalendar } from '../../../lib/board-date-settings';

export function getDatePartsInTimezone(timezone, now = new Date()) {
  return sharedGetDateParts(timezone, now);
}

export function getDayKeyInTimezone(timezone, now = new Date()) {
  return getCivilDayKeyInTimezone(timezone, now);
}

export function getGregorianDateInTimezone(timezone, now = new Date()) {
  return sharedGetGregorian(timezone, now);
}

export function getHebrewDateInTimezone(timezone, now = new Date(), options = {}) {
  return sharedGetHebrew(timezone, now, options);
}

export function getBoardTimezone() {
  return resolveBoardTimezone(getBoardData());
}

/** Location + calendar options used for Hebrew sunset day boundaries (1.35.0 I54/I58). */
export function getBoardDayBoundaryOptions(data = getBoardData()) {
  const loc = getBoardLocation(data);
  return {
    calendar: resolveBoardCalendar(data),
    lat: loc.lat,
    lng: loc.lng,
  };
}

export function getCalendarDayKey(timezone, now = new Date(), options = getBoardDayBoundaryOptions()) {
  return sharedGetCalendarDayKey(timezone, now, options);
}

export function msUntilNextMidnight(timezone, now = new Date()) {
  return sharedMsUntilMidnight(timezone, now);
}

export function msUntilNextDayBoundary(timezone, now = new Date(), options = getBoardDayBoundaryOptions()) {
  return sharedMsUntilBoundary(timezone, now, options);
}

/**
 * 1.35.0 I54: one timer to the next day boundary (midnight or sunset), plus a refresh when the
 * screen wakes (visibility/focus/pageshow). No per-minute polling.
 * Do NOT touch the 8s content-version poll in BoardDataContext.
 */
export function subscribeToCalendarDayChange(
  callback,
  timezone = getBoardTimezone(),
  options = getBoardDayBoundaryOptions(),
) {
  let dayKey = getCalendarDayKey(timezone, new Date(), options);
  let boundaryTimer = null;

  const check = () => {
    const nextKey = getCalendarDayKey(timezone, new Date(), options);
    if (nextKey !== dayKey) {
      dayKey = nextKey;
      callback(nextKey);
    }
  };

  const scheduleBoundary = () => {
    if (boundaryTimer) {
      window.clearTimeout(boundaryTimer);
    }
    boundaryTimer = window.setTimeout(() => {
      check();
      scheduleBoundary();
    }, msUntilNextDayBoundary(timezone, new Date(), options));
  };

  const onWake = () => {
    check();
    scheduleBoundary();
  };

  scheduleBoundary();

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onWake);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);
  }

  return () => {
    if (boundaryTimer) {
      window.clearTimeout(boundaryTimer);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onWake);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
    }
  };
}
