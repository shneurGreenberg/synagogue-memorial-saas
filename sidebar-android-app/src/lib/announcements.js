const MIN_UPCOMING_DATES = 6;
const COMMUNITY_EVENT_REPEAT_INTERVAL = 3;

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

function cloneAnnouncementItem(item, suffix) {
  return { ...item, id: `${item.id}-rep-${suffix}` };
}

function repeatEventsForScroll(events, cycles = 6) {
  const repeated = [];
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    events.forEach((event, index) => {
      repeated.push(cloneAnnouncementItem(event, `scroll-${cycle}-${index}`));
    });
  }
  return repeated;
}

function interleaveCommunityEvents(announcements, events, interval = COMMUNITY_EVENT_REPEAT_INTERVAL) {
  if (!events.length) return announcements;
  if (!announcements.length) return repeatEventsForScroll(events);

  const undatedEvents = events.filter((event) => event.isUndated);
  const datedEvents = events.filter((event) => !event.isUndated);
  const injectableEvents = datedEvents.length ? datedEvents : events;
  const result = [...undatedEvents];
  let cycle = 0;

  announcements.forEach((item, index) => {
    result.push(item);
    if ((index + 1) % interval !== 0) return;
    injectableEvents.forEach((event, eventIndex) => {
      result.push(cloneAnnouncementItem(event, `${index}-${eventIndex}-${cycle}`));
    });
    cycle += 1;
  });

  const hasInjectedEvent = result.some(
    (item) => item.listType === 'event' && String(item.id).includes('-rep-'),
  );

  if (!hasInjectedEvent) {
    return [...events, ...announcements];
  }

  return result;
}

function buildHolidayItems(holidays) {
  return (holidays || []).map((holiday) => {
    const gregorianDate = parseIsoDate(holiday.date);
    return {
      listType: 'holiday',
      id: `holiday-${holiday.date}-${holiday.title}`,
      title: holiday.title,
      date: holiday.date,
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
  return (events || []).map((event) => {
    const title = event.titles?.[lang] || event.titles?.ru || event.titles?.en || event.title || '';
    const text = event.texts?.[lang] || event.texts?.ru || event.texts?.en || event.text || '';
    const hasDate = Boolean(event.eventDate?.month && event.eventDate?.date);

    if (!hasDate) {
      return {
        listType: 'event',
        id: `event-${event._id || event.id}`,
        title,
        text,
        isUndated: true,
        eventDate: null,
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
    };
  });
}

export function buildAnnouncementItems({
  holidays = [],
  chabadDates = [],
  communityEvents = [],
  boardFeatures = {},
}) {
  const holidayItems = boardFeatures.upcomingHolidays !== false ? buildHolidayItems(holidays) : [];
  const chabadItems = boardFeatures.upcomingHolidays !== false ? buildChabadItems(chabadDates) : [];
  const eventItems = boardFeatures.communityEvents !== false ? communityEvents : [];
  const announcements = selectNearestUpcoming([...holidayItems, ...chabadItems]);
  return interleaveCommunityEvents(announcements, eventItems);
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
