/**
 * 1.29: board layout mode + weekly prayer times (combined board).
 */
const BOARD_MODES = ['memorial', 'combined'];
const MAX_PRAYER_ROWS = 60;

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

// 1.36.0 I62/I63: rows keep the order the admin dragged them into. Kinds:
//   'prayer'  — a prayer time (prayers group)
//   'class'   — a lesson time (lessons group)
//   'heading' — a small sub-heading inside the lessons group (e.g. a weekday); no time.
const ROW_KINDS = ['prayer', 'class', 'heading'];
function normalizeRowKind(kind) {
  return ROW_KINDS.includes(kind) ? kind : 'prayer';
}

function normalizePrayerTimes(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const kind = normalizeRowKind(row && row.kind);
      return {
        label: String((row && row.label) || '').trim().slice(0, 60),
        time: kind === 'heading' ? '' : normalizeTime(row && row.time),
        kind,
      };
    })
    .filter((row) => row.label && (row.kind === 'heading' || row.time))
    // 1.32.0 I39: prayers first, then the lessons group (headings live in the lessons group).
    // Stable sort: inside each group the saved (dragged) order is kept.
    .sort((a, b) => groupRank(a.kind) - groupRank(b.kind))
    .slice(0, MAX_PRAYER_ROWS);
}

function groupRank(kind) {
  return kind === 'prayer' ? 0 : 1;
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
  return base.slice(0, MAX_PRAYER_ROWS).map((row, index) => {
    const kind = normalizeRowKind(row.kind);
    return {
      ...row,
      kind,
      isClass: kind !== 'prayer',
      isHeading: kind === 'heading',
      index,
    };
  });
}

// 1.34.0 I51: the community messages box has no heading any more, so 'announcements' is no longer
// a title key (the stored value stays harmless).
const DEFAULT_SECTION_TITLES = {
  he: { prayers: 'זמני תפילות', classes: 'שיעורים', zmanim: 'זמני היום' },
  ru: { prayers: 'Время молитв', classes: 'Уроки', zmanim: 'Зманим — галахическое время дня' },
  en: { prayers: 'Prayer times', classes: 'Classes', zmanim: 'Today’s zmanim' },
};
function defaultSectionTitles(language) {
  return DEFAULT_SECTION_TITLES[language] || DEFAULT_SECTION_TITLES.he;
}

// 1.34.0 I46: 'classes' gets its own heading; 1.34.0 I51 drops the announcements heading.
const SECTION_TITLE_KEYS = ['prayers', 'classes', 'zmanim'];
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
  ROW_KINDS,
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
