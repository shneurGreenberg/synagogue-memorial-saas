const MAX_DAYS_AHEAD = 30;

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
  const diff = a.sortDate - b.sortDate;
  if (diff !== 0) {
    return diff;
  }

  return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
}

export function buildHolidaySidebarItems(holidays) {
  const now = new Date();

  return (holidays || [])
    .map((holiday) => {
      const gregorianDate = parseIsoDate(holiday.date);

      return {
        listType: 'holiday',
        id: `holiday-${holiday.date}-${holiday.title}`,
        title: holiday.title,
        date: holiday.date,
        gregorianDate,
        sortDate: gregorianDate.getTime(),
      };
    })
    .filter((item) => isWithinUpcomingWindow(item.sortDate, now));
}

export function buildSidebarAnnouncements(communityEvents, holidays, boardFeatures = {}) {
  const now = new Date();

  const events = boardFeatures.communityEvents !== false
    ? (communityEvents || []).map((event) => ({
      ...event,
      listType: 'event',
      sortDate: event.gregorianDate ? event.gregorianDate.getTime() : 0,
    }))
      .filter((item) => item.sortDate && isWithinUpcomingWindow(item.sortDate, now))
    : [];

  const holidayItems = boardFeatures.upcomingHolidays !== false
    ? buildHolidaySidebarItems(holidays)
    : [];

  return [...holidayItems, ...events]
    .sort(sortByDate);
}
