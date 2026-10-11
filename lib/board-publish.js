const CLIENTS = new Set(['board', 'sidebar', 'presentation', 'android']);
const SCREEN_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const RECENT_MS = 3 * 60 * 1000;
const RETAIN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SCREENS = 200;

function resolvePublishedVersion(value) {
  const version = Number(value);
  if (Number.isFinite(version) && version >= 1) {
    return Math.floor(version);
  }

  return 1;
}

function nextPublishedVersion(current) {
  return resolvePublishedVersion(current) + 1;
}

function normalizeScreenReport(body) {
  const screenId = String(body && body.screenId ? body.screenId : '').trim();
  if (!SCREEN_ID_RE.test(screenId)) {
    return null;
  }

  const clientRaw = String(body && body.client ? body.client : 'board').trim();
  const publishedVersion = Number(body && body.publishedVersion);
  const label = String(body && body.label ? body.label : '').trim().slice(0, 80);

  return {
    screenId,
    client: CLIENTS.has(clientRaw) ? clientRaw : 'board',
    label,
    publishedVersion: Number.isFinite(publishedVersion) && publishedVersion >= 0
      ? Math.floor(publishedVersion)
      : 0,
  };
}

function recordBoardScreen(screens, report, now = new Date()) {
  const normalized = report && report.screenId && report.client
    ? report
    : normalizeScreenReport(report);

  const current = Array.isArray(screens) ? screens : [];
  if (!normalized || !SCREEN_ID_RE.test(normalized.screenId)) {
    return current;
  }

  const nowMs = now.getTime();
  const kept = current.filter((entry) => {
    if (!entry || entry.screenId === normalized.screenId) {
      return false;
    }

    const seen = entry.lastSeenAt ? new Date(entry.lastSeenAt).getTime() : 0;
    return Number.isFinite(seen) && nowMs - seen < RETAIN_MS;
  });

  kept.push({
    screenId: normalized.screenId,
    client: CLIENTS.has(normalized.client) ? normalized.client : 'board',
    label: String(normalized.label || '').slice(0, 80),
    publishedVersion: Number(normalized.publishedVersion) || 0,
    lastSeenAt: now,
  });

  return kept.slice(-MAX_SCREENS);
}

function summarizeBoardScreens(screens, publishedVersion, now = new Date()) {
  const version = resolvePublishedVersion(publishedVersion);
  const nowMs = now.getTime();
  const list = (Array.isArray(screens) ? screens : [])
    .filter((entry) => entry && entry.screenId)
    .map((entry) => ({
      screenId: entry.screenId,
      client: CLIENTS.has(entry.client) ? entry.client : 'board',
      label: entry.label || '',
      publishedVersion: Number(entry.publishedVersion) || 0,
      lastSeenAt: entry.lastSeenAt ? new Date(entry.lastSeenAt).toISOString() : null,
    }))
    .sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')));

  const recent = list.filter((entry) => {
    if (!entry.lastSeenAt) {
      return false;
    }

    return nowMs - new Date(entry.lastSeenAt).getTime() <= RECENT_MS;
  });

  const onPublishedVersion = recent.filter((entry) => entry.publishedVersion === version).length;

  return {
    publishedVersion: version,
    recentCount: recent.length,
    onPublishedVersion,
    pendingCount: recent.length - onPublishedVersion,
    screens: list,
  };
}

function formatPublishedAt(value, lang) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const locale = lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-GB' : 'ru-RU';
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = {
  RECENT_MS,
  resolvePublishedVersion,
  nextPublishedVersion,
  normalizeScreenReport,
  recordBoardScreen,
  summarizeBoardScreens,
  formatPublishedAt,
};
