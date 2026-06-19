function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function isCommunityEventVisible(event, now = new Date()) {
  const endAt = event.endAt ? new Date(event.endAt) : null;

  if (endAt && endAt <= now) {
    return false;
  }

  const startAt = event.startAt ? new Date(event.startAt) : null;

  if (startAt && startAt > now) {
    return false;
  }

  return true;
}

export function getVisibleCommunityEvents(events, now = new Date()) {
  return (events || []).filter((event) => isCommunityEventVisible(event, now));
}

export function getSidebarCommunityEvents(events, now = new Date()) {
  return getVisibleCommunityEvents(events, now);
}

export function hasEventDate(event) {
  return Boolean(event?.eventDate?.month && event?.eventDate?.date);
}
