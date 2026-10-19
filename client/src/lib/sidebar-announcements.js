const MIN_UPCOMING_DATES = 6;

function parseIsoDate(dateStr) {
  if (!dateStr) {
    return new Date();
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function sortByDate(a, b) {
  if (a.isUndated && !b.isUndated) {
    return -1;
  }

  if (!a.isUndated && b.isUndated) {
    return 1;
  }

  const diff = (a.sortDate || 0) - (b.sortDate || 0);
  if (diff !== 0) {
    return diff;
  }

  return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
}

function selectNearestUpcoming(items, now = new Date(), minCount = MIN_UPCOMING_DATES) {
  const undated = items.filter((item) => item.isUndated);
  const today = startOfDay(now);
  const dated = items
    .filter((item) => !item.isUndated && item.sortDate && startOfDay(item.sortDate) >= today)
    .sort(sortByDate);

  const selectedDated = dated.slice(0, minCount);

  return [...undated, ...selectedDated].sort(sortByDate);
}

function buildHolidaySidebarItems(holidays) {
  return (holidays || []).map((holiday) => {
    const gregorianDate = parseIsoDate(holiday.date);
    const dateEnd = holiday.dateEnd && holiday.dateEnd !== holiday.date ? holiday.dateEnd : null;

    return {
      listType: 'holiday',
      id: `holiday-${holiday.date}-${holiday.dateEnd || ''}-${holiday.title}`,
      title: holiday.title,
      date: holiday.date,
      dateEnd,
      hebrew: holiday.hebrew || '',
      hebrewEnd: holiday.hebrewEnd || '',
      isRange: Boolean(holiday.isRange && dateEnd),
      gregorianDate,
      sortDate: gregorianDate.getTime(),
    };
  });
}

function buildChabadSidebarItems(chabadDates) {
  return (chabadDates || []).map((entry) => {
    const gregorianDate = parseIsoDate(entry.date);

    return {
      listType: 'chabad',
      id: `chabad-${entry.date}-${entry.title}`,
      title: entry.title,
      date: entry.date,
      gregorianDate,
      sortDate: gregorianDate.getTime(),
    };
  });
}

function isPlaceholder(text) {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  return lower.includes('lorem') || 
         lower.includes('ipsum') || 
         lower.includes('placeholder') ||
         lower === 'test' ||
         lower === 'тест';
}

function buildEventSidebarItems(communityEvents) {
  return sortEventsByManualOrder(
    (communityEvents || [])
      .filter((event) => !isPlaceholder(event.title) && !isPlaceholder(event.text))
      .map((event) => ({
        ...event,
        listType: 'event',
        sortOrder: Number.isFinite(Number(event.sortOrder)) ? Number(event.sortOrder) : 0,
        sortDate: event.isUndated ? null : (event.gregorianDate ? event.gregorianDate.getTime() : null),
      })),
  );
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

export function buildSidebarAnnouncements(communityEvents, holidays, chabadDates, boardFeatures = {}) {
  const events = boardFeatures.communityEvents !== false
    ? buildEventSidebarItems(communityEvents)
    : [];

  const holidayItems = boardFeatures.upcomingHolidays !== false
    ? buildHolidaySidebarItems(holidays)
    : [];

  const chabadItems = boardFeatures.chabadDates !== false
    ? buildChabadSidebarItems(chabadDates)
    : [];

  const announcements = selectNearestUpcoming([...holidayItems, ...chabadItems]);

  return [...announcements, ...events];
}
