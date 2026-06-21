export const BOARD_FEATURE_DEFAULTS = {
  sidebarNames: true,
  dailyChumash: true,
  dailyTehillim: true,
  dailyTanya: true,
  dailyRambam: true,
  hayomYom: true,
  upcomingHolidays: true,
  communityEvents: true,
  kelMaleRachamim: true,
  izkor: true,
  weather: false,
  sunriseSunset: false,
};

export function resolveBoardFeatures(raw) {
  const source = raw || {};
  const resolved = {};

  Object.keys(BOARD_FEATURE_DEFAULTS).forEach((key) => {
    resolved[key] = typeof source[key] === 'boolean'
      ? source[key]
      : BOARD_FEATURE_DEFAULTS[key];
  });

  return resolved;
}

export function hasJewishContentPanels(boardFeatures) {
  const features = resolveBoardFeatures(boardFeatures);

  return features.dailyChumash
    || features.dailyTehillim
    || features.dailyTanya
    || features.dailyRambam
    || features.hayomYom;
}
