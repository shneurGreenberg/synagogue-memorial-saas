const BOARD_FEATURE_DEFAULTS = {
  dailyChumash: true,
  dailyTehillim: false,
  dailyRambam: true,
  dailyTanya: true,
  hayomYom: false,
  upcomingHolidays: true,
  chabadDates: true,
  communityEvents: true,
  kelMaleRachamim: true,
  izkor: true,
  weather: false,
  officialLogo: true,
};

const FEATURE_FORM_KEYS = Object.keys(BOARD_FEATURE_DEFAULTS);

const DAILY_STUDY_FEATURE_KEYS = [
  'dailyChumash',
  'dailyTehillim',
  'dailyTanya',
  'dailyRambam',
  'hayomYom',
];

function hasDailyStudyFeatures(features) {
  const source = features || {};
  return DAILY_STUDY_FEATURE_KEYS.some((key) => source[key] === true);
}

function reconcileKelMaleAndDailyStudy(features, body) {
  const parsed = { ...features };
  const kelOn = parsed.kelMaleRachamim === true;
  const learningOn = hasDailyStudyFeatures(parsed);

  if (!kelOn || !learningOn) {
    return parsed;
  }

  const kelToggled = body && (body.feature_kelMaleRachamim === '1' || body.feature_kelMaleRachamim === 'on');
  const learningToggled = body && DAILY_STUDY_FEATURE_KEYS.some(
    (key) => body[`feature_${key}`] === '1' || body[`feature_${key}`] === 'on',
  );

  if (kelToggled && !learningToggled) {
    DAILY_STUDY_FEATURE_KEYS.forEach((key) => {
      parsed[key] = false;
    });
    return parsed;
  }

  parsed.kelMaleRachamim = false;
  return parsed;
}

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

function isChabadDatesEnabled(raw) {
  return normalizeBoardFeatures(raw).chabadDates !== false;
}

function parseBoardFeaturesFromBody(body) {
  const parsed = {};

  FEATURE_FORM_KEYS.forEach((key) => {
    parsed[key] = body[`feature_${key}`] === '1' || body[`feature_${key}`] === 'on';
  });

  return reconcileKelMaleAndDailyStudy(normalizeBoardFeatures(parsed), body);
}

module.exports = {
  BOARD_FEATURE_DEFAULTS,
  FEATURE_FORM_KEYS,
  DAILY_STUDY_FEATURE_KEYS,
  hasDailyStudyFeatures,
  reconcileKelMaleAndDailyStudy,
  normalizeBoardFeatures,
  isChabadDatesEnabled,
  parseBoardFeaturesFromBody,
};
