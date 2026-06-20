import Hebcal from 'hebcal';
import { resolveBoardTimezone } from './timezone';
import { getBoardData } from './board-data';

function getDatePartsInTimezone(timezone, now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = {};
  formatter.formatToParts(now).forEach((part) => {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  });

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function getDayKeyInTimezone(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function getGregorianDateInTimezone(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

export function getHebrewDateInTimezone(timezone, now = new Date()) {
  const gregorian = getGregorianDateInTimezone(timezone, now);
  return new Hebcal.HDate(gregorian);
}

export function getBoardTimezone() {
  return resolveBoardTimezone(getBoardData());
}

export function msUntilNextMidnight(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  const elapsedMs = (
    (parts.hour * 3600)
    + (parts.minute * 60)
    + parts.second
  ) * 1000;
  const remaining = (24 * 3600 * 1000) - elapsedMs;
  return Math.max(remaining + 1000, 60000);
}

export function subscribeToCalendarDayChange(callback, timezone = getBoardTimezone()) {
  let dayKey = getDayKeyInTimezone(timezone);
  let midnightTimer = null;
  let minuteTimer = null;

  const check = () => {
    const nextKey = getDayKeyInTimezone(timezone);
    if (nextKey !== dayKey) {
      dayKey = nextKey;
      callback(nextKey);
    }
  };

  const scheduleMidnight = () => {
    if (midnightTimer) {
      window.clearTimeout(midnightTimer);
    }

    midnightTimer = window.setTimeout(() => {
      check();
      scheduleMidnight();
    }, msUntilNextMidnight(timezone));
  };

  minuteTimer = window.setInterval(check, 60000);
  scheduleMidnight();

  return () => {
    if (midnightTimer) {
      window.clearTimeout(midnightTimer);
    }
    if (minuteTimer) {
      window.clearInterval(minuteTimer);
    }
  };
}
