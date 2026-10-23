const { formatHebrewDate } = require('./hebrew-date-format');
const {
  getGregorianDateInTimezone,
  getDayKeyInTimezone,
  getHebrewDateInTimezone,
  isYahrzeitOnDate,
  resolveSynagogueTimezone,
  resolveYahrzeitOptions,
} = require('./yahrzeit');

function resolveHebrewLang(adminLanguage) {
  const lang = String(adminLanguage || 'he').trim();
  if (lang === 'en') {
    return 'en';
  }
  if (lang === 'he') {
    return 'he';
  }
  return 'ru';
}

function gregorianLabelFromDayKey(dayKey) {
  const [year, month, day] = String(dayKey || '').split('-');
  if (!year || !month || !day) {
    return '';
  }
  return `${day}/${month}/${year}`;
}

function buildUpcomingYahrzeitRows(synagogue, now, maxDays, adminLanguage) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const options = resolveYahrzeitOptions(synagogue);
  const today = getGregorianDateInTimezone(timezone, now);
  const hebrewLang = resolveHebrewLang(adminLanguage);
  const rows = [];
  const days = Math.max(0, Number(maxDays) || 0);

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    const dayKey = getDayKeyInTimezone(timezone, date);
    const hebrewDate = getHebrewDateInTimezone(timezone, date);
    const hebrewDateLabel = formatHebrewDate(hebrewDate, hebrewLang);
    const gregorianDateLabel = gregorianLabelFromDayKey(dayKey);

    (synagogue.people || []).forEach((person) => {
      if (!isYahrzeitOnDate(person, date, options)) {
        return;
      }
      rows.push({
        id: person.id,
        name: person.name || '',
        searchQuery: encodeURIComponent(person.name || ''),
        hebrewDateLabel,
        gregorianDateLabel,
        dayKey,
      });
    });
  }

  rows.sort((a, b) => {
    const byDay = a.dayKey.localeCompare(b.dayKey);
    if (byDay !== 0) {
      return byDay;
    }
    return String(a.name).localeCompare(String(b.name), 'he');
  });

  return rows;
}

module.exports = {
  buildUpcomingYahrzeitRows,
};
