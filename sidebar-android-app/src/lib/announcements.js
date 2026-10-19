const MIN_UPCOMING_DATES = 6;

function parseIsoDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function sortByDate(a, b) {
  if (a.isUndated && !b.isUndated) return -1;
  if (!a.isUndated && b.isUndated) return 1;
  const diff = (a.sortDate || 0) - (b.sortDate || 0);
  if (diff !== 0) return diff;
  return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
}

function selectNearestUpcoming(items, now = new Date(), minCount = MIN_UPCOMING_DATES) {
  const undated = items.filter((item) => item.isUndated);
  const today = startOfDay(now);
  const dated = items
    .filter((item) => !item.isUndated && item.sortDate && startOfDay(item.sortDate) >= today)
    .sort(sortByDate);

  return [...undated, ...dated.slice(0, minCount)].sort(sortByDate);
}

function sortEventsByManualOrder(events) {
  return [...events].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 0;
    const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return sortByDate(a, b);
  });
}

function buildHolidayItems(holidays) {
  return (holidays || []).map((holiday) => {
    const gregorianDate = parseIsoDate(holiday.date);
    const dateEnd = holiday.dateEnd && holiday.dateEnd !== holiday.date ? holiday.dateEnd : null;
    return {
      listType: 'holiday',
      id: `holiday-${holiday.date}-${holiday.dateEnd || ''}-${holiday.title}`,
      title: holiday.title,
      date: holiday.date,
      dateEnd,
      isRange: Boolean(holiday.isRange && dateEnd),
      hebrew: holiday.hebrew || '',
      hebrewEnd: holiday.hebrewEnd || '',
      sortDate: gregorianDate.getTime(),
    };
  });
}

function buildChabadItems(chabadDates) {
  return (chabadDates || []).map((entry) => {
    const gregorianDate = parseIsoDate(entry.date);
    return {
      listType: 'chabad',
      id: `chabad-${entry.date}-${entry.title}`,
      title: entry.title,
      date: entry.date,
      sortDate: gregorianDate.getTime(),
    };
  });
}

export function prepareCommunityEvents(events, lang = 'ru') {
  const mapped = (events || []).map((event) => {
    const title = event.title
      || event.titles?.[lang]
      || event.titles?.ru
      || event.titles?.en
      || event.titles?.he
      || '';
    const text = event.text
      || event.texts?.[lang]
      || event.texts?.ru
      || event.texts?.en
      || event.texts?.he
      || '';
    const hasDate = Boolean(event.eventDate?.month && event.eventDate?.date);

    if (!hasDate) {
      return {
        listType: 'event',
        id: `event-${event._id || event.id}`,
        title,
        text,
        isUndated: true,
        eventDate: null,
        sortOrder: Number.isFinite(Number(event.sortOrder)) ? Number(event.sortOrder) : 0,
      };
    }

    const year = event.eventDate.year || new Date().getFullYear();
    const gregorianDate = new Date(year, event.eventDate.month - 1, event.eventDate.date);

    return {
      listType: 'event',
      id: `event-${event._id || event.id}`,
      title,
      text,
      isUndated: false,
      eventDate: event.eventDate,
      gregorianDate,
      sortDate: gregorianDate.getTime(),
      sortOrder: Number.isFinite(Number(event.sortOrder)) ? Number(event.sortOrder) : 0,
    };
  });

  return sortEventsByManualOrder(mapped);
}

export function buildAnnouncementItems({
  holidays = [],
  chabadDates = [],
  communityEvents = [],
  boardFeatures = {},
}) {
  const holidayItems = boardFeatures.upcomingHolidays !== false ? buildHolidayItems(holidays) : [];
  const chabadItems = boardFeatures.chabadDates !== false ? buildChabadItems(chabadDates) : [];
  const eventItems = boardFeatures.communityEvents !== false ? communityEvents : [];
  const announcements = selectNearestUpcoming([...holidayItems, ...chabadItems]);
  return [...announcements, ...sortEventsByManualOrder(eventItems)];
}

export function buildWidgetAnnouncementsJson(items, lang = 'ru') {
  const payload = (items || []).map((item) => {
    if (item.listType === 'event') {
      let date = '';
      if (item.eventDate?.month && item.eventDate?.date) {
        const year = item.eventDate.year || new Date().getFullYear();
        const gregorian = new Date(year, item.eventDate.month - 1, item.eventDate.date);
        date = gregorian.toLocaleDateString(
          lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-US' : 'ru-RU',
          { day: 'numeric', month: 'long', year: 'numeric' },
        );
      }
      return {
        type: 'event',
        title: item.title || '',
        text: item.text || '',
        date,
      };
    }

    return {
      type: item.listType || 'holiday',
      title: item.title || '',
      text: '',
      date: item.date ? formatHolidayDate(item.date, lang) : '',
    };
  });

  return JSON.stringify(payload);
}

export function formatHolidayDate(dateStr, lang = 'ru') {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (lang === 'he') {
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  }
  if (lang === 'en') {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
