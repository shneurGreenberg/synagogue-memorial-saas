/** Class names and row layout for the daily study (limud) grid on the board. */

const DAILY_GATE_KEY_ORDER = ['chumash', 'tanya', 'tehillim', 'rambam1', 'rambam3'];

function isDailyGateKeyEnabled(key, boardFeatures, learning) {
  switch (key) {
    case 'chumash':
      return Boolean(boardFeatures.dailyChumash && learning.chumash?.label);
    case 'tanya':
      return Boolean(boardFeatures.dailyTanya && learning.tanya?.label);
    case 'tehillim':
      return Boolean(boardFeatures.dailyTehillim && learning.tehillim?.label);
    case 'rambam1':
      return Boolean(boardFeatures.dailyRambam && learning.rambam?.label);
    case 'rambam3':
      return Boolean(boardFeatures.dailyRambam && learning.rambam3?.label);
    default:
      return false;
  }
}

function getEnabledDailyGateKeys(boardFeatures, learning) {
  return DAILY_GATE_KEY_ORDER.filter((key) => isDailyGateKeyEnabled(key, boardFeatures, learning));
}

/**
 * @param {string[]} keys — enabled keys in DAILY_GATE_KEY_ORDER
 * @returns {{ keys: string[], single?: boolean }[]}
 */
function buildDailyGateRows(keys) {
  const rows = [];
  for (let i = 0; i < keys.length; i += 2) {
    const slice = keys.slice(i, i + 2);
    if (slice.length === 2) {
      rows.push({ keys: slice });
    } else {
      rows.push({ keys: slice, single: true });
    }
  }
  return rows;
}

function dailyGateRowClassName(single) {
  return single ? 'daily-gates-row daily-gates-row--single' : 'daily-gates-row';
}

module.exports = {
  DAILY_GATE_KEY_ORDER,
  buildDailyGateRows,
  dailyGateRowClassName,
  getEnabledDailyGateKeys,
  isDailyGateKeyEnabled,
};
