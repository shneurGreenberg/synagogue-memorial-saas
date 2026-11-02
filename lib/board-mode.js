/**
 * 1.29: board layout mode + weekly prayer times (combined board).
 */
const BOARD_MODES = ['memorial', 'combined'];
const MAX_PRAYER_ROWS = 24;

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
      kind: row && row.kind === 'class' ? 'class' : 'prayer',
    }))
    .filter((row) => row.label && row.time)
    // 1.32.0 I39: prayers first, then classes (stable within each group)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'prayer' ? -1 : 1))
    .slice(0, MAX_PRAYER_ROWS);
}

function parsePrayerTimesFromBody(body = {}) {
  const rows = [];
  for (let i = 0; i < MAX_PRAYER_ROWS; i += 1) {
    if (!Object.prototype.hasOwnProperty.call(body, `prayerLabel_${i}`)) continue;
    rows.push({ label: body[`prayerLabel_${i}`], time: body[`prayerTime_${i}`], kind: body[`prayerKind_${i}`] });
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
  const base = saved.length ? saved : DEFAULT_PRAYER_LABELS[lang].map((label) => ({ label, time: '', kind: 'prayer' }));
  return base.slice(0, MAX_PRAYER_ROWS).map((row, index) => ({ ...row, kind: row.kind === 'class' ? 'class' : 'prayer', isClass: row.kind === 'class', index }));
}

const DEFAULT_SECTION_TITLES = {
  he: { announcements: 'הודעות הקהילה', prayers: 'זמני תפילות', zmanim: 'זמני היום' },
  ru: { announcements: 'Объявления общины', prayers: 'Время молитв', zmanim: 'Зманим на сегодня' },
  en: { announcements: 'Community announcements', prayers: 'Prayer times', zmanim: 'Today’s zmanim' },
};
function defaultSectionTitles(language) {
  return DEFAULT_SECTION_TITLES[language] || DEFAULT_SECTION_TITLES.he;
}

const SECTION_TITLE_KEYS = ['announcements', 'prayers', 'zmanim'];
function normalizeSectionTitles(value = {}) {
  const out = {};
  SECTION_TITLE_KEYS.forEach((key) => {
    out[key] = String((value && value[key]) || '').trim().slice(0, 60);
  });
  return out;
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
  SECTION_TITLE_KEYS,
  normalizeSectionTitles,
  defaultSectionTitles,
};
