import Hebcal from 'hebcal';
import { configureNovosibirsk } from './novosibirsk';

const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';
const CANDLE_LIGHTING_MINUTES = 18;
const HAVDALAH_MINUTES = 42;

function atNoon(date) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

function addMinutes(date, minutes) {
  if (!date) {
    return null;
  }
  return new Date(new Date(date).getTime() + minutes * 60 * 1000);
}

function subtractMinutes(date, minutes) {
  if (!date) {
    return null;
  }
  return new Date(new Date(date).getTime() - minutes * 60 * 1000);
}

export function getBoardTimezone(data) {
  return (data && data.location && data.location.timezone) || DEFAULT_TIMEZONE;
}

function getShabbatEnter(hFriday) {
  return subtractMinutes(hFriday.sunset(), CANDLE_LIGHTING_MINUTES);
}

function getShabbatExit(hSaturday) {
  return addMinutes(hSaturday.sunset(), HAVDALAH_MINUTES);
}

export function getDisplayedShabbatTimes(now = new Date()) {
  try {
    configureNovosibirsk();

    for (let offset = -7; offset <= 28; offset += 1) {
      const friday = atNoon(now);
      friday.setDate(friday.getDate() + offset);

      const hFriday = new Hebcal.HDate(friday);
      if (hFriday.getDay() !== 5) {
        continue;
      }

      const enter = getShabbatEnter(hFriday);
      if (!enter) {
        continue;
      }

      const saturday = new Date(friday);
      saturday.setDate(saturday.getDate() + 1);
      const hSaturday = new Hebcal.HDate(atNoon(saturday));
      const exit = getShabbatExit(hSaturday);
      if (!exit) {
        continue;
      }

      if (exit > now) {
        return {
          enter,
          exit,
          sunrise: hSaturday.sunrise(),
          sunset: hFriday.sunset(),
        };
      }
    }
  } catch (err) {
    console.error('Shabbat times calculation failed:', err);
  }

  return null;
}

export function formatShabbatClockTime(date, timezone = DEFAULT_TIMEZONE) {
  if (!date) {
    return '—';
  }

  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(value);
}

export function msUntilNextRefresh(now = new Date()) {
  const times = getDisplayedShabbatTimes(now);
  if (!times) {
    return 60 * 60 * 1000;
  }

  const boundaries = [times.enter, times.exit].filter(Boolean);
  const upcoming = boundaries
    .map((date) => new Date(date).getTime() - now.getTime())
    .filter((ms) => ms > 0);

  if (upcoming.length === 0) {
    return 60 * 1000;
  }

  return Math.min(...upcoming, 60 * 60 * 1000);
}
