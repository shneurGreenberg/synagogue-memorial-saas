function parseIsoDateParts(dateStr) {
  const [year, month, day] = String(dateStr || '').split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return { year, month, day };
}

function daysBetweenIso(startStr, endStr) {
  const start = parseIsoDateParts(startStr);
  const end = parseIsoDateParts(endStr);
  if (!start || !end) {
    return 0;
  }
  const a = new Date(start.year, start.month - 1, start.day);
  const b = new Date(end.year, end.month - 1, end.day);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function isSigdHoliday(item) {
  const title = String(item.title || '');
  const hebrew = String(item.hebrew || '');
  return title === 'Sigd' || /\bsigd\b/i.test(title) || hebrew.includes('סיגד');
}

function collapseGroupKey(item) {
  const title = String(item.title || '');
  const subcat = String(item.subcat || '').toLowerCase();
  const hebrew = String(item.hebrew || '');

  if (subcat === 'cholhamoed' || /chol hamoed/i.test(title) || hebrew.includes('חול המועד')) {
    const match = title.match(/^(.+?)\s+(?:[IVX]+|\d+)\s+\(Chol Hamoed\)/i);
    return match ? `chol:${match[1].trim()}` : `chol:${title}`;
  }

  if (/^chanukah/i.test(title) || /^chanukah:/i.test(title) || hebrew.includes('חנוכה')) {
    return 'chanukah';
  }

  return null;
}

function rangeTitleForGroup(groupKey, firstItem, lang) {
  if (groupKey === 'chanukah') {
    return lang === 'he' ? 'חנוכה' : (lang === 'ru' ? 'Ханука' : 'Chanukah');
  }

  if (groupKey.startsWith('chol:')) {
    const base = groupKey.slice(5);
    const cholLabel = lang === 'he' ? 'חול המועד' : (lang === 'ru' ? 'Холь ха-Моэд' : 'Chol HaMoed');
    return `${base} (${cholLabel})`;
  }

  return firstItem.title;
}

function collapseHolidayRuns(items, lang) {
  const result = [];
  let index = 0;

  while (index < items.length) {
    const item = items[index];
    const groupKey = collapseGroupKey(item);

    if (!groupKey) {
      result.push({
        date: item.date,
        dateEnd: item.date,
        title: lang === 'he' ? (item.hebrew || item.title) : item.title,
        hebrew: item.hebrew || '',
        hebrewEnd: item.hebrew || '',
        isRange: false,
      });
      index += 1;
      continue;
    }

    let endIndex = index;
    while (endIndex + 1 < items.length) {
      const next = items[endIndex + 1];
      if (collapseGroupKey(next) !== groupKey) {
        break;
      }
      if (daysBetweenIso(items[endIndex].date, next.date) !== 1) {
        break;
      }
      endIndex += 1;
    }

    const first = items[index];
    const last = items[endIndex];
    result.push({
      date: first.date,
      dateEnd: last.date,
      title: rangeTitleForGroup(groupKey, first, lang),
      hebrew: first.hebrew || '',
      hebrewEnd: last.hebrew || '',
      isRange: endIndex > index,
    });
    index = endIndex + 1;
  }

  return result;
}

export function processUpcomingHebcalHolidays(items, lang, todayIso, limit = 20) {
  const filtered = (items || [])
    .filter((item) => item.category === 'holiday' && item.date >= todayIso)
    .filter((item) => !isSigdHoliday(item));

  return collapseHolidayRuns(filtered, lang).slice(0, limit);
}
