/** Class names and row visibility for the daily study (limud) grid on the board. */

const DAILY_GATE_RAMBAM3_SPAN_CLASS = 'daily-gate-tile--span-2';

function chumashTanyaRowClassName(hasChumash, hasTanya) {
  if (hasChumash && hasTanya) {
    return 'daily-gates-row';
  }
  return 'daily-gates-row daily-gates-row--single';
}

function shouldShowTehillimRambamRow(boardFeatures, learning) {
  const showTehillim = Boolean(boardFeatures.dailyTehillim);
  const showRambam1 = Boolean(boardFeatures.dailyRambam && learning.rambam);
  return showTehillim || showRambam1;
}

function shouldShowRambam3Row(boardFeatures, learning) {
  return Boolean(boardFeatures.dailyRambam && learning.rambam3);
}

function rambam3TileClassName() {
  return `daily-gate-tile ${DAILY_GATE_RAMBAM3_SPAN_CLASS}`;
}

module.exports = {
  DAILY_GATE_RAMBAM3_SPAN_CLASS,
  chumashTanyaRowClassName,
  shouldShowTehillimRambamRow,
  shouldShowRambam3Row,
  rambam3TileClassName,
};
