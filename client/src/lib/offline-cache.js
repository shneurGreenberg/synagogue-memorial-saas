// 1.31.0 I25: tiny localStorage cache so an offline board keeps working for ~30 days.
const PREFIX = 'board-offline:v1:';

function storage() {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readOffline(key) {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeOffline(key, value) {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // Quota: drop the oldest day entries and retry once.
    pruneOffline(() => true, 10);
    try { s.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch { return false; }
  }
}

/** Remove cached keys for which shouldDrop(key) is true (max n when given). */
export function pruneOffline(shouldDrop, max = Infinity) {
  const s = storage();
  if (!s) return 0;
  const drop = [];
  try {
    for (let i = 0; i < s.length; i += 1) {
      const k = s.key(i);
      if (k && k.startsWith(PREFIX) && shouldDrop(k.slice(PREFIX.length))) drop.push(k);
    }
  } catch {
    return 0;
  }
  drop.sort();
  drop.slice(0, max).forEach((k) => { try { s.removeItem(k); } catch { /* ignore */ } });
  return Math.min(drop.length, max);
}

/** YYYY-MM-DD + n days (UTC arithmetic on the calendar date). */
export function addDaysToKey(dayKey, n) {
  const [y, m, d] = String(dayKey).split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
