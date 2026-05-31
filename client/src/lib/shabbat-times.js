import Hebcal from 'hebcal';

const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';

function atNoon(date) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

export function getBoardTimezone(data) {
  return (data && data.location && data.location.timezone) || DEFAULT_TIMEZONE;
}

export function getDisplayedShabbatTimes(now = new Date()) {
  for (let offset = -7; offset <= 28; offset += 1) {
    const friday = atNoon(now);
    friday.setDate(friday.getDate() + offset);

    const hFriday = new Hebcal.HDate(friday);
    if (hFriday.getDay() !== 5) {
      continue;
    }

    const enter = hFriday.candleLighting();
    if (!enter) {
      continue;
    }

    const saturday = new Date(friday);
    saturday.setDate(saturday.getDate() + 1);
    const hSaturday = new Hebcal.HDate(atNoon(saturday));
    const exit = hSaturday.havdalah();
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
