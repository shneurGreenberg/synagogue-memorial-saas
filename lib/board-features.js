const BOARD_FEATURE_DEFAULTS = {
  sidebarNames: true,
  dailyChumash: true,
  dailyTehillim: false,
  dailyRambam: true,
  dailyTanya: true,
  hayomYom: false,
  upcomingHolidays: true,
  communityEvents: true,
  kelMaleRachamim: true,
  izkor: true,
  weather: false,
  sunriseSunset: false,
  officialLogo: true,
};

const FEATURE_FORM_KEYS = Object.keys(BOARD_FEATURE_DEFAULTS);

function normalizeBoardFeatures(raw) {
  const source = raw || {};
  const normalized = {};

  FEATURE_FORM_KEYS.forEach((key) => {
    if (typeof source[key] === 'boolean') {
      normalized[key] = source[key];
      return;
    }

    normalized[key] = BOARD_FEATURE_DEFAULTS[key];
  });

  return normalized;
}

function parseBoardFeaturesFromBody(body) {
  const parsed = {};

  FEATURE_FORM_KEYS.forEach((key) => {
    parsed[key] = body[`feature_${key}`] === '1' || body[`feature_${key}`] === 'on';
  });

  return normalizeBoardFeatures(parsed);
}

module.exports = {
  BOARD_FEATURE_DEFAULTS,
  FEATURE_FORM_KEYS,
  normalizeBoardFeatures,
  parseBoardFeaturesFromBody,
};
