/**
 * 1.34.0 I52: alarm-clock-like scheduling for the board slideshow.
 *
 * The slideshow can be limited to a window: an optional date range plus weekday windows with a
 * start and an end time (e.g. Sunday 01:00-02:00). Everything is evaluated in the community's own
 * timezone and decided on the server, so a "dumb" TV only has to render what the payload says.
 *
 * Empty schedule (no range, no day windows) = always show when the slideshow is enabled.
 */

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

/** 'HH:MM' (accepts '7:05') -> 'HH:MM', or '' when it is not a real time. */
function normalizeTime(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  const m = raw.replace('.', ':').match(TIME_RE);
  if (!m) return '';
  return `${pad2(Number(m[1]))}:${m[2]}`;
}

/** 'YYYY-MM-DD' -> 'YYYY-MM-DD', or '' when it is not a real calendar date. */
function normalizeDate(value) {
  const raw = String(value == null ? '' : value).trim();
  const m = raw.match(DATE_RE);
  if (!m) return '';
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return '';
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function normalizeDayNumber(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 6) return null;
  return n;
}

/**
 * Normalize the stored/pasted schedule into `{ from, to, days: [{ day, start, end }] }`.
 * Bad times and unknown weekdays are dropped rather than rejected, so one broken field can never
 * take the whole slideshow down.
 */
function normalizeSlideshowSchedule(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const from = normalizeDate(source.from);
  const to = normalizeDate(source.to);
  const seen = new Set();
  const days = [];

  (Array.isArray(source.days) ? source.days : []).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const day = normalizeDayNumber(entry.day);
    const start = normalizeTime(entry.start);
    const end = normalizeTime(entry.end);
    if (day == null || !start || !end) return;
    // Equal start and end would be a zero-length window, which is never what an owner means.
    if (start === end) return;
    if (seen.has(day)) return;
    seen.add(day);
    days.push({ day, start, end });
  });

  days.sort((a, b) => a.day - b.day);
  // An inverted range ("from" after "to") is a typo: keep only the start.
  return { from, to: to && from && to < from ? '' : to, days };
}

function minutesOf(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return h * 60 + m;
}

/** Local wall-clock parts of `now` in `timeZone`. */
function localParts(now, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    // 'long' (not 'short'): both give a full day name in some ICU versions, but 'long' is stable.
    weekday: 'long',
    hour12: false,
  });
  const parts = {};
  formatter.formatToParts(now).forEach((part) => {
    if (part.type !== 'literal') parts[part.type] = part.value;
  });
  const weekdayIndex = WEEKDAY_KEYS.indexOf(String(parts.weekday || '').toLowerCase());
  // Some ICU versions render midnight as hour "24" with hour12:false.
  const hour = Number(parts.hour) % 24;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    weekday: weekdayIndex >= 0 ? weekdayIndex : 0,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
  };
}

function hasSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return false;
  const normalized = normalizeSlideshowSchedule(schedule);
  return !!(normalized.from || normalized.to || normalized.days.length);
}

/**
 * Is the slideshow inside its window at `now`?
 * Returns `{ active, reason }`; `reason` is only for logs/tests.
 */
function isSlideshowActiveAt(schedule, now = new Date(), timeZone = 'UTC') {
  const normalized = normalizeSlideshowSchedule(schedule);
  if (!normalized.from && !normalized.to && !normalized.days.length) {
    return { active: true, reason: 'always' };
  }

  const local = localParts(now, timeZone);
  if (normalized.from && local.dateKey < normalized.from) {
    return { active: false, reason: 'before_range' };
  }
  if (normalized.to && local.dateKey > normalized.to) {
    return { active: false, reason: 'after_range' };
  }
  if (!normalized.days.length) {
    return { active: true, reason: 'in_range' };
  }

  const nowMinutes = local.minutes;
  for (let i = 0; i < normalized.days.length; i += 1) {
    const window = normalized.days[i];
    const start = minutesOf(window.start);
    const end = minutesOf(window.end);
    if (start < end) {
      // Same-day window, e.g. 10:00-13:00.
      if (window.day === local.weekday && nowMinutes >= start && nowMinutes < end) {
        return { active: true, reason: 'in_window' };
      }
    } else {
      // Cross-midnight window, e.g. 23:00-01:00: it runs from the chosen day into the next one, so
      // the early-morning tail belongs to the PREVIOUS weekday.
      const previousDay = (local.weekday + 6) % 7;
      if (window.day === local.weekday && nowMinutes >= start) {
        return { active: true, reason: 'in_window' };
      }
      if (window.day === previousDay && nowMinutes < end) {
        return { active: true, reason: 'in_window' };
      }
    }
  }

  return { active: false, reason: 'outside_window' };
}

/** Hebrew summary for the admin, e.g. "מוצג בימי ראשון 01:00-02:00". */
function describeSlideshowSchedule(schedule, labels = {}) {
  const normalized = normalizeSlideshowSchedule(schedule);
  const dayNames = labels.dayNames || ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const parts = [];
  normalized.days.forEach((window) => {
    parts.push(`${dayNames[window.day] || window.day} ${window.start}–${window.end}`);
  });
  let range = '';
  if (normalized.from && normalized.to) range = `${normalized.from} – ${normalized.to}`;
  else if (normalized.from) range = `${labels.fromPrefix || 'מ־'}${normalized.from}`;
  else if (normalized.to) range = `${labels.toPrefix || 'עד '}${normalized.to}`;
  return { range, windows: parts };
}

/** Apply the schedule to a board/public slideshow object (returns a new object, never mutates). */
function applyScheduleToSlideshow(slideshow, now = new Date(), timeZone = 'UTC') {
  if (!slideshow || typeof slideshow !== 'object') {
    return slideshow;
  }
  const schedule = normalizeSlideshowSchedule(slideshow.schedule);
  if (!slideshow.enabled) {
    return { ...slideshow, schedule, scheduleActive: false };
  }
  const { active } = isSlideshowActiveAt(schedule, now, timeZone);
  return {
    ...slideshow,
    schedule,
    scheduleActive: active,
    // Outside the window the board must fall back to the NORMAL display, i.e. slideshow off.
    enabled: slideshow.enabled && active,
  };
}

module.exports = {
  WEEKDAY_KEYS,
  normalizeTime,
  normalizeDate,
  normalizeSlideshowSchedule,
  hasSchedule,
  isSlideshowActiveAt,
  describeSlideshowSchedule,
  applyScheduleToSlideshow,
  localParts,
};
