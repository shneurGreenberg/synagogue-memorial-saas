function parseIsoDate(dateStr) {
  if (!dateStr) {
    return new Date();
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function sortByDate(a, b) {
  const diff = a.sortDate - b.sortDate;
  if (diff !== 0) {
    return diff;
  }

  return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
}

export function buildHolidaySidebarItems(holidays) {
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

export function buildSidebarAnnouncements(communityEvents, holidays, boardFeatures = {}) {
  const events = boardFeatures.communityEvents !== false
    ? (communityEvents || []).map((event) => ({
      ...event,
      listType: 'event',
      sortDate: event.gregorianDate ? event.gregorianDate.getTime() : 0,
    }))
    : [];

  const holidayItems = boardFeatures.upcomingHolidays !== false
    ? buildHolidaySidebarItems(holidays)
    : [];

  return [...holidayItems, ...events]
    .sort(sortByDate);
}
