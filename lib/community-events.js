function parseDateTimeInput(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function categorizeCommunityEvents(events, now = new Date()) {
  const active = [];
  const scheduled = [];
  const history = [];

  (events || []).forEach((event) => {
    const startAt = event.startAt ? new Date(event.startAt) : null;
    const endAt = event.endAt ? new Date(event.endAt) : null;

    if (!startAt) {
      return;
    }

    if (endAt && endAt <= now) {
      history.push(event);
      return;
    }

    if (startAt > now) {
      scheduled.push(event);
      return;
    }

    active.push(event);
  });

  const byStartDesc = (a, b) => new Date(b.startAt) - new Date(a.startAt);
  active.sort(byStartDesc);
  scheduled.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  history.sort((a, b) => new Date(b.endAt || b.startAt) - new Date(a.endAt || a.startAt));

  return { active, scheduled, history };
}

function getVisibleCommunityEvents(events, now = new Date()) {
  return categorizeCommunityEvents(events, now).active;
}

function parseEventDateFields(body) {
  const month = parseInt(body.eventMonth, 10);
  const date = parseInt(body.eventDate, 10);
  const year = parseInt(body.eventYear, 10);

  return {
    month: Number.isFinite(month) ? month : 1,
    date: Number.isFinite(date) ? date : 1,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
  };
}

function buildCommunityEventPayload(body, options = {}) {
  const publishNow = !!options.publishNow;
  const startAt = publishNow
    ? new Date()
    : parseDateTimeInput(body.startAt);

  if (!startAt) {
    throw new Error('Start date is required');
  }

  const endAt = parseDateTimeInput(body.endAt);
  if (endAt && endAt <= startAt) {
    throw new Error('End date must be after start date');
  }

  return {
    title: String(body.title || '').trim(),
    text: String(body.text || '').trim(),
    eventDate: parseEventDateFields(body),
    startAt,
    endAt,
  };
}

module.exports = {
  parseDateTimeInput,
  categorizeCommunityEvents,
  getVisibleCommunityEvents,
  parseEventDateFields,
  buildCommunityEventPayload,
};
