function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function getVisibleCommunityEvents(events, now = new Date()) {
  return (events || []).filter((event) => {
    const startAt = event.startAt ? new Date(event.startAt) : null;
    const endAt = event.endAt ? new Date(event.endAt) : null;

    if (!startAt || startAt > now) {
      return false;
    }

    if (endAt && endAt <= now) {
      return false;
    }

    return true;
  });
}

export function getUpcomingCommunityEvents(events, now = new Date(), maxDaysAhead = 30) {
  const today = startOfDay(now);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + maxDaysAhead);

  return (events || []).filter((event) => {
    const startAt = event.startAt ? new Date(event.startAt) : null;
    const endAt = event.endAt ? new Date(event.endAt) : null;

    if (!startAt) {
      return false;
    }

    if (endAt && endAt <= now) {
      return false;
    }

    const month = event.eventDate?.month || 1;
    const day = event.eventDate?.date || 1;
    const year = event.eventDate?.year || now.getFullYear();
    const eventDay = startOfDay(new Date(year, month - 1, day));

    return eventDay >= today && eventDay <= limit;
  });
}
