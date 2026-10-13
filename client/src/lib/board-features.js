export const BOARD_FEATURE_DEFAULTS = {
  dailyChumash: true,
  dailyTehillim: false,
  dailyTanya: true,
  dailyRambam: true,
  hayomYom: false,
  upcomingHolidays: true,
  communityEvents: true,
  kelMaleRachamim: true,
  izkor: true,
  weather: false,
  sunriseSunset: false,
  officialLogo: true,
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

const DAILY_STUDY_FEATURE_KEYS = [
  'dailyChumash',
  'dailyTehillim',
  'dailyTanya',
  'dailyRambam',
  'hayomYom',
];

export function hasDailyStudyFeatures(boardFeatures) {
  const features = resolveBoardFeatures(boardFeatures);
  return DAILY_STUDY_FEATURE_KEYS.some((key) => features[key]);
}

export function hasJewishContentPanels(boardFeatures) {
  return hasDailyStudyFeatures(boardFeatures);
}
