// 1.30.2: ?scale=<number> scales the whole board (for TVs where text is too big).
export const SCALE_MIN = 0.3;
export const SCALE_MAX = 1.5;
export const SCALE_STORAGE_KEY = 'kaddish-board-scale';

export function parseScale(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(n * 1000) / 1000));
}

/** URL param always wins (and is persisted); otherwise the stored value. ?scale=1 / reset clears. */
export function resolveScale(search, storage) {
  const params = new URLSearchParams(search || '');
  if (params.has('scale')) {
    const raw = params.get('scale');
    const s = raw === 'reset' ? null : parseScale(raw);
    try {
      if (s == null || s === 1) storage?.removeItem(SCALE_STORAGE_KEY);
      else storage?.setItem(SCALE_STORAGE_KEY, String(s));
    } catch (_) { /* storage unavailable */ }
    return s == null ? 1 : s;
  }
  let stored = null;
  try { stored = parseScale(storage?.getItem(SCALE_STORAGE_KEY)); } catch (_) { stored = null; }
  return stored == null ? 1 : stored;
}

export function supportsCssZoom(doc) {
  try {
    if (typeof CSS !== 'undefined' && CSS.supports) return CSS.supports('zoom', '0.5');
  } catch (_) { /* ignore */ }
  return !!(doc && doc.documentElement && 'zoom' in doc.documentElement.style);
}

export function applyBoardScale(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.document) return 1;
  const { pathname, search } = win.location;
  if (!/^\/s\/[^/]+/.test(pathname || '') && !/[#?&]scale=/.test(win.location.href || '')) return 1;
  let storage = null;
  try { storage = win.localStorage; } catch (_) { storage = null; }
  const scale = resolveScale(search, storage);
  if (scale === 1) return 1;
  const html = win.document.documentElement;
  html.style.setProperty('--board-scale', String(scale));
  html.classList.add('board-scaled');
  if (supportsCssZoom(win.document)) {
    html.style.zoom = String(scale);
    html.classList.add('board-scaled--zoom');
  } else {
    html.classList.add('board-scaled--transform');
  }
  return scale;
}
