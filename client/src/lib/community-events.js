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
