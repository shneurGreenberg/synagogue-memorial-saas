// 1.30.0 I10: two per-community date settings replace the old "hebrewDatesOnly" toggle.
//   boardCalendar: 'hebrew' | 'gregorian' — what drives board order, "yahrzeit today" and the admin list.
//   dateDisplay:   'both' | 'hebrew' | 'gregorian' — which date text is shown on tiles and in the admin list.
// Migration is read-time and idempotent: a community that never saved the new fields is resolved from
// the legacy flag (hebrewDatesOnly=true -> hebrew + hebrew only; otherwise the previous behaviour:
// gregorian order + both dates).
const BOARD_CALENDARS = ['hebrew', 'gregorian'];
const DATE_DISPLAYS = ['both', 'hebrew', 'gregorian'];

function resolveBoardCalendar(source) {
  const s = source || {};
  if (BOARD_CALENDARS.includes(s.boardCalendar)) return s.boardCalendar;
  return s.hebrewDatesOnly === true ? 'hebrew' : 'gregorian';
}

function resolveDateDisplay(source) {
  const s = source || {};
  if (DATE_DISPLAYS.includes(s.dateDisplay)) return s.dateDisplay;
  return s.hebrewDatesOnly === true ? 'hebrew' : 'both';
}

function normalizeBoardCalendar(value, fallback = 'gregorian') {
  return BOARD_CALENDARS.includes(value) ? value : fallback;
}

function normalizeDateDisplay(value, fallback = 'both') {
  return DATE_DISPLAYS.includes(value) ? value : fallback;
}

module.exports = {
  BOARD_CALENDARS,
  DATE_DISPLAYS,
  resolveBoardCalendar,
  resolveDateDisplay,
  normalizeBoardCalendar,
  normalizeDateDisplay,
};
