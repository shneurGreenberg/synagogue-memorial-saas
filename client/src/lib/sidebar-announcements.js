const MAX_DAYS_AHEAD = 30;
const MIN_ITEMS = 4;

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

function isWithinUpcomingWindow(sortDate, now = new Date(), maxDaysAhead = MAX_DAYS_AHEAD) {
  const today = startOfDay(now);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + maxDaysAhead);
  const itemDay = startOfDay(sortDate);

  return itemDay >= today && itemDay <= limit;
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

function selectUpcomingWithFallback(items, now = new Date(), maxDaysAhead = MAX_DAYS_AHEAD, minCount = MIN_ITEMS) {
  const undated = items.filter((item) => item.isUndated);
  const dated = items.filter((item) => !item.isUndated && item.sortDate);
  const inWindow = dated.filter((item) => isWithinUpcomingWindow(item.sortDate, now, maxDaysAhead));
  const selected = [...undated, ...inWindow];
  const selectedIds = new Set(selected.map((item) => item.id));

  if (selected.length >= minCount) {
    return selected.sort(sortByDate);
  }

  const today = startOfDay(now);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + maxDaysAhead);

  const afterWindow = dated
    .filter((item) => !selectedIds.has(item.id) && startOfDay(item.sortDate) > limit)
    .sort(sortByDate);

  const needed = minCount - selected.length;

  return [...selected, ...afterWindow.slice(0, needed)].sort(sortByDate);
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

  return selectUpcomingWithFallback(merged);
}
