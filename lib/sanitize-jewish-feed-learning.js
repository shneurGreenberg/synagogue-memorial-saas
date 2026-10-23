const { sanitizeRussianLearningText } = require('./jewish-translations');

const DAILY_LEARNING_KEYS = ['chumash', 'tehillim', 'tanya', 'rambam', 'rambam3'];

function sanitizeLearningItemLabel(item, lang) {
  if (!item || typeof item !== 'object') {
    return item;
  }
  const label = String(item.label || '').trim();
  if (!label || lang !== 'ru') {
    return item;
  }
  const cleaned = sanitizeRussianLearningText(label);
  if (cleaned === label) {
    return item;
  }
  return { ...item, label: cleaned };
}

function sanitizeDailyLearningBlock(dailyLearning, lang) {
  if (!dailyLearning || typeof dailyLearning !== 'object') {
    return dailyLearning;
  }

  const next = { ...dailyLearning };
  for (const key of DAILY_LEARNING_KEYS) {
    if (next[key]) {
      next[key] = sanitizeLearningItemLabel(next[key], lang);
    }
  }

  const hayomYom = next.hayomYom;
  if (hayomYom && typeof hayomYom === 'object' && hayomYom.lessons5703) {
    const lessons5703 = { ...hayomYom.lessons5703 };
    for (const key of DAILY_LEARNING_KEYS) {
      if (lessons5703[key]) {
        lessons5703[key] = sanitizeLearningItemLabel(lessons5703[key], lang);
      }
    }
    next.hayomYom = { ...hayomYom, lessons5703 };
  }

  return next;
}

function sanitizeJewishFeedPayload(feed, lang = 'ru') {
  if (!feed || typeof feed !== 'object') {
    return feed;
  }

  const next = { ...feed };
  if (next.dailyLearning) {
    next.dailyLearning = sanitizeDailyLearningBlock(next.dailyLearning, lang);
  }
  return next;
}

module.exports = {
  sanitizeLearningItemLabel,
  sanitizeDailyLearningBlock,
  sanitizeJewishFeedPayload,
};
