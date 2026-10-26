/**
 * 1.29: board layout mode + weekly prayer times (combined board).
 */
const BOARD_MODES = ['memorial', 'combined'];
const MAX_PRAYER_ROWS = 10;

const DEFAULT_PRAYER_LABELS = {
  he: ['שחרית', 'מנחה', 'ערבית', 'שחרית שבת', 'מנחה שבת', 'ערבית מוצאי שבת'],
  ru: ['Шахарит', 'Минха', 'Маарив', 'Шахарит в Шаббат', 'Минха в Шаббат', 'Маарив на исходе Шаббата'],
  en: ['Shacharit', 'Mincha', 'Maariv', 'Shabbat Shacharit', 'Shabbat Mincha', 'Motzei Shabbat Maariv'],
};

function normalizeBoardMode(value) {
  return BOARD_MODES.includes(value) ? value : 'memorial';
}

function normalizeTime(value) {
  const raw = String(value == null ? '' : value).trim();
  const m = raw.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return '';
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function normalizePrayerTimes(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      label: String((row && row.label) || '').trim().slice(0, 60),
      time: normalizeTime(row && row.time),
    }))
    .filter((row) => row.label && row.time)
    .slice(0, MAX_PRAYER_ROWS);
}

function parsePrayerTimesFromBody(body = {}) {
  const rows = [];
  for (let i = 0; i < MAX_PRAYER_ROWS; i += 1) {
    if (!Object.prototype.hasOwnProperty.call(body, `prayerLabel_${i}`)) continue;
    rows.push({ label: body[`prayerLabel_${i}`], time: body[`prayerTime_${i}`] });
  }
  return normalizePrayerTimes(rows);
}

function hasPrayerTimesPayload(body = {}) {
  return Object.prototype.hasOwnProperty.call(body, 'prayerTimesSection');
}

/** Rows for the admin form: saved rows, else default labels (empty times) in the board language. */
function prayerTimeRowsForAdmin(synagogue = {}) {
  const saved = normalizePrayerTimes(synagogue.prayerTimes);
  const lang = ['he', 'ru', 'en'].includes(synagogue.language) ? synagogue.language : 'he';
  const base = saved.length ? saved : DEFAULT_PRAYER_LABELS[lang].map((label) => ({ label, time: '' }));
  const rows = base.slice(0, MAX_PRAYER_ROWS);
  while (rows.length < Math.min(MAX_PRAYER_ROWS, Math.max(base.length + 2, 8))) {
    rows.push({ label: '', time: '' });
  }
  return rows.map((row, index) => ({ ...row, index }));
}

module.exports = {
  BOARD_MODES,
  MAX_PRAYER_ROWS,
  DEFAULT_PRAYER_LABELS,
  normalizeBoardMode,
  normalizePrayerTimes,
  parsePrayerTimesFromBody,
  hasPrayerTimesPayload,
  prayerTimeRowsForAdmin,
};
