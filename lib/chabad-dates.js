const fs = require('fs');
const path = require('path');
const Hebcal = require('hebcal');

const CHABAD_DATES_PATH = path.join(__dirname, '..', 'data', 'chabad-dates.json');

function loadChabadDates() {
  const raw = JSON.parse(fs.readFileSync(CHABAD_DATES_PATH, 'utf8'));
  return Array.isArray(raw.dates) ? raw.dates : [];
}

const CHABAD_DATES = loadChabadDates();

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function pickLang(labels, lang) {
  if (!labels) {
    return '';
  }

  if (lang === 'he' && labels.he) {
    return labels.he;
  }

  if (lang === 'en' && labels.en) {
    return labels.en;
  }

  return labels.ru || labels.en || labels.he || '';
}

function endOfNextCalendarMonth(fromDate) {
  const start = startOfDay(fromDate);
  const year = start.getFullYear();
  const month = start.getMonth();
  return new Date(year, month + 2, 0);
}

function daysAheadThroughEndOfNextMonth(fromDate = new Date()) {
  const start = startOfDay(fromDate);
  const end = startOfDay(endOfNextCalendarMonth(fromDate));
  let days = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    days += 1;
  }
  return days;
}

function hebrewMonthsForEntry(entry, hYear) {
  const baseMonth = entry.hMonth;
  const policy = entry.adarPolicy || 'default';

  if (baseMonth !== 12 && baseMonth !== 13) {
    return [baseMonth];
  }

  const isLeap = new Hebcal.HDate(1, 7, hYear).isLeapYear();

  if (policy === 'ii') {
    return isLeap ? [13] : [12];
  }

  if (policy === 'i') {
    return [12];
  }

  if (policy === 'both' && isLeap) {
    return [12, 13];
  }

  return [baseMonth];
}

function getUpcomingChabadDates(lang = 'ru', fromDate = new Date(), daysAhead) {
  const start = startOfDay(fromDate);
  const ahead = Number.isFinite(daysAhead) ? daysAhead : daysAheadThroughEndOfNextMonth(fromDate);
  const end = new Date(start);
  end.setDate(end.getDate() + ahead);
  const todayIso = formatIsoDate(start);

  const hToday = new Hebcal.HDate(start);
  const results = [];
  const seen = new Set();

  CHABAD_DATES.forEach((entry) => {
    for (let yearOffset = 0; yearOffset <= 1; yearOffset += 1) {
      const hYear = hToday.getFullYear() + yearOffset;
      const months = hebrewMonthsForEntry(entry, hYear);

      months.forEach((hMonth) => {
        try {
          const hdate = new Hebcal.HDate(entry.hDay, hMonth, hYear);
          const gdate = startOfDay(hdate.greg());

          if (gdate < start || gdate > end) {
            return;
          }

          const date = formatIsoDate(gdate);
          const key = `${date}:${hMonth}:${entry.hDay}`;

          if (seen.has(key) || date < todayIso) {
            return;
          }

          seen.add(key);
          results.push({
            date,
            title: pickLang(entry.title, lang),
            hebrew: entry.title.he || '',
            description: pickLang(entry.description, lang),
            category: 'chabad',
          });
        } catch {
          /* skip invalid Hebrew dates in this year */
        }
      });
    }
  });

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  CHABAD_DATES,
  CHABAD_DATES_PATH,
  loadChabadDates,
  getUpcomingChabadDates,
  daysAheadThroughEndOfNextMonth,
  endOfNextCalendarMonth,
  hebrewMonthsForEntry,
};
