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

    return {
      listType: 'holiday',
      id: `holiday-${holiday.date}-${holiday.title}`,
      title: holiday.title,
      date: holiday.date,
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

function buildEventSidebarItems(communityEvents) {
  return (communityEvents || []).map((event) => ({
    ...event,
    listType: 'event',
    sortDate: event.isUndated ? null : (event.gregorianDate ? event.gregorianDate.getTime() : null),
  }));
}

export function buildSidebarAnnouncements(communityEvents, holidays, chabadDates, boardFeatures = {}) {
  const events = boardFeatures.communityEvents !== false
    ? buildEventSidebarItems(communityEvents)
    : [];

  const holidayItems = boardFeatures.upcomingHolidays !== false
    ? buildHolidaySidebarItems(holidays)
    : [];

  const chabadItems = boardFeatures.upcomingHolidays !== false
    ? buildChabadSidebarItems(chabadDates)
    : [];

  const merged = [...holidayItems, ...chabadItems, ...events];

  return selectNearestUpcoming(merged);
}
