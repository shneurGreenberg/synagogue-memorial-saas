/**
 * 1.35.0 I59: separate text-size controls for זמני היום and תפילות.
 * Existing communities only have combinedInfoScale — both new fields default to that value.
 */
function clampScale(value, fallback = 100) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(250, Math.max(50, n));
}

function resolveCombinedInfoScales(source = {}) {
  const legacy = clampScale(source.combinedInfoScale, 100);
  return {
    combinedInfoScale: legacy,
    combinedZmanimScale: source.combinedZmanimScale == null || source.combinedZmanimScale === ''
      ? legacy
      : clampScale(source.combinedZmanimScale, legacy),
    combinedPrayersScale: source.combinedPrayersScale == null || source.combinedPrayersScale === ''
      ? legacy
      : clampScale(source.combinedPrayersScale, legacy),
    combinedAnnouncementScale: clampScale(source.combinedAnnouncementScale, 100),
  };
}

module.exports = {
  clampScale,
  resolveCombinedInfoScales,
};
