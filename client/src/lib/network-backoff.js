// 1.30.1 I19: quiet exponential backoff for board network refreshes while offline.
export function backoffDelayMs(attempt, { baseMs = 30 * 1000, maxMs = 30 * 60 * 1000 } = {}) {
  const n = Math.max(0, Math.floor(Number(attempt) || 0));
  return Math.min(maxMs, baseMs * 2 ** Math.min(n, 20));
}

export function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// Keep the last good value when a refresh fails (null/undefined) so nothing flashes empty.
export function keepLastGood(previous, next) {
  return next == null ? previous : next;
}
