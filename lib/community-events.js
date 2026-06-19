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

function hasEventDateFields(eventDate) {
  return Boolean(eventDate && eventDate.month && eventDate.date);
}

function categorizeCommunityEvents(events, now = new Date()) {
  const active = [];
  const scheduled = [];
  const history = [];

  (events || []).forEach((event) => {
    const startAt = event.startAt ? new Date(event.startAt) : null;
    const endAt = event.endAt ? new Date(event.endAt) : null;

    if (endAt && endAt <= now) {
      history.push(event);
      return;
    }

    if (startAt && startAt > now) {
      scheduled.push(event);
      return;
    }

    active.push(event);
  });

  const byStartDesc = (a, b) => new Date(b.startAt || 0) - new Date(a.startAt || 0);
  active.sort(byStartDesc);
  scheduled.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  history.sort((a, b) => new Date(b.endAt || b.startAt || 0) - new Date(a.endAt || a.startAt || 0));

  return { active, scheduled, history };
}

function getVisibleCommunityEvents(events, now = new Date()) {
  return categorizeCommunityEvents(events, now).active;
}

function parseEventDateFields(body) {
  const month = parseInt(body.eventMonth, 10);
  const date = parseInt(body.eventDate, 10);
  const year = parseInt(body.eventYear, 10);

  if (!Number.isFinite(month) || !Number.isFinite(date)) {
    return null;
  }

  return {
    month,
    date,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
  };
}

function resolveStartAt(body, options = {}) {
  if (options.publishNow) {
    return new Date();
  }

  const explicit = parseDateTimeInput(body.startAt);
  if (explicit) {
    return explicit;
  }

  const eventDate = parseEventDateFields(body);
  if (hasEventDateFields(eventDate)) {
    return new Date(eventDate.year, eventDate.month - 1, eventDate.date);
  }

  return new Date();
}

function buildCommunityEventPayload(body, options = {}) {
  const title = String(body.title || '').trim();

  if (!title) {
    throw new Error('Title is required');
  }

  const publishNow = !!options.publishNow;
  const startAt = resolveStartAt(body, { publishNow });
  const eventDate = parseEventDateFields(body);
  const endAt = parseDateTimeInput(body.endAt);

  if (endAt && startAt && endAt <= startAt) {
    throw new Error('End date must be after start date');
  }

  const payload = {
    title,
    text: String(body.text || '').trim(),
    startAt,
  };

  if (hasEventDateFields(eventDate)) {
    payload.eventDate = eventDate;
  }

  if (endAt) {
    payload.endAt = endAt;
  }

  return payload;
}

module.exports = {
  parseDateTimeInput,
  categorizeCommunityEvents,
  getVisibleCommunityEvents,
  hasEventDateFields,
  parseEventDateFields,
  resolveStartAt,
  buildCommunityEventPayload,
};
