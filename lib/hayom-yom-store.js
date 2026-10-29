const HayomYom = require('../models/HayomYom');
const { fetchHebrewAphorism, SOURCE: HEBREW_SOURCE } = require('./chabadlibrary-scraper');
const { scrapeDailyLearning } = require('./lchaim-scraper');
const { scrapeChabadHayomYom } = require('./chabad-hayom-yom-scraper');
const { translateWithCache, sanitizeLocalizedText } = require('./mymemory-translate');
const { getHayomYomDisplayText } = require('./hayom-yom-display-text');
const { sanitizeHayomYomText } = require('./hayom-yom-sanitize');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function translateText(text, langPair) {
  return translateWithCache(text, langPair);
}

function cleanLocalizedField(value, fallback) {
  return getHayomYomDisplayText(sanitizeLocalizedText(value, fallback), fallback);
}

function cleanHayomYomAphorism(value) {
  return sanitizeHayomYomText(value);
}

async function getHayomYomByHebrewDate(hebrewMonth, hebrewDay) {
  return HayomYom.findOne({ hebrewMonth, hebrewDay }).lean();
}

async function upsertHayomYomEntry(hebrewMonth, hebrewDay, payload) {
  return HayomYom.findOneAndUpdate(
    { hebrewMonth, hebrewDay },
    {
      hebrewMonth,
      hebrewDay,
      ...payload,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function ensureHayomYomForDate(date, hebrewMonth, hebrewDay) {
  const existing = await getHayomYomByHebrewDate(hebrewMonth, hebrewDay);
  const hasOriginalHebrew = Boolean(existing?.text?.he) && existing?.hebrewSource === HEBREW_SOURCE;
  if (existing && existing.text?.en && existing.text?.ru && hasOriginalHebrew) {
    return existing;
  }

  let scraped = null;
  let chabad = null;

  try {
    scraped = await scrapeDailyLearning(date);
  } catch {
    scraped = null;
  }

  try {
    chabad = await scrapeChabadHayomYom(date);
  } catch {
    chabad = null;
  }

  // 1.29.5 I6: Hebrew must be the original text from chabadlibrary.org — never a translation.
  let hebrewText = hasOriginalHebrew ? cleanHayomYomAphorism(existing.text.he) : '';
  if (!hebrewText) {
    let year;
    try {
      const Hebcal = require('hebcal');
      year = new Hebcal.HDate(date || new Date()).getFullYear();
    } catch {
      year = undefined;
    }
    hebrewText = cleanHayomYomAphorism(await fetchHebrewAphorism(hebrewMonth, hebrewDay, { year }));
  }
  const hebrewSource = hebrewText ? HEBREW_SOURCE : '';

  const englishText = cleanHayomYomAphorism(
    scraped?.aphorism || chabad?.aphorismEn || existing?.text?.en || '',
  );
  let russianText = existing?.text?.ru || '';

  russianText = cleanLocalizedField(russianText, '');
  if (!russianText && englishText) {
    russianText = await translateText(englishText, 'en|ru');
    await sleep(400);
  }
  russianText = cleanLocalizedField(russianText, englishText);

  const scraped5703 = scraped?.lessons5703 || {};
  const chabad5703 = chabad?.lessons5703 || {};

  const lessons5703 = {
    chumash: {
      en: scraped5703.chumash || chabad5703.chumash || existing?.lessons5703?.chumash?.en || '',
      he: existing?.lessons5703?.chumash?.he || '',
      ru: cleanLocalizedField(
        existing?.lessons5703?.chumash?.ru,
        '',
      ) || (scraped5703.chumash || chabad5703.chumash
        ? cleanLocalizedField(
          await translateText(scraped5703.chumash || chabad5703.chumash, 'en|ru'),
          scraped5703.chumash || chabad5703.chumash,
        )
        : ''),
    },
    tehillim: {
      en: scraped5703.tehillim || chabad5703.tehillim || existing?.lessons5703?.tehillim?.en || '',
      he: existing?.lessons5703?.tehillim?.he || '',
      ru: cleanLocalizedField(
        existing?.lessons5703?.tehillim?.ru,
        '',
      ) || (scraped5703.tehillim || chabad5703.tehillim
        ? cleanLocalizedField(
          await translateText(scraped5703.tehillim || chabad5703.tehillim, 'en|ru'),
          scraped5703.tehillim || chabad5703.tehillim,
        )
        : ''),
    },
    tanya: {
      en: scraped5703.tanya || chabad5703.tanya || existing?.lessons5703?.tanya?.en || '',
      he: existing?.lessons5703?.tanya?.he || '',
      ru: cleanLocalizedField(
        existing?.lessons5703?.tanya?.ru,
        '',
      ) || (scraped5703.tanya || chabad5703.tanya
        ? cleanLocalizedField(
          await translateText(scraped5703.tanya || chabad5703.tanya, 'en|ru'),
          scraped5703.tanya || chabad5703.tanya,
        )
        : ''),
    },
  };

  if (!englishText && !hebrewText && !russianText) {
    return existing || null;
  }

  return upsertHayomYomEntry(hebrewMonth, hebrewDay, {
    text: {
      en: cleanHayomYomAphorism(englishText),
      he: cleanHayomYomAphorism(hebrewText),
      ru: cleanHayomYomAphorism(russianText),
    },
    hebrewSource,
    lessons5703,
  });
}

// 1.29.5 I6: one-time cleanup — drop stored Hebrew that was machine-translated (no original source).
async function invalidateTranslatedHebrew() {
  const res = await HayomYom.updateMany(
    { hebrewSource: { $ne: HEBREW_SOURCE }, 'text.he': { $nin: ['', null] } },
    { $set: { 'text.he': '', hebrewSource: '' } },
  );
  return res?.modifiedCount || 0;
}

module.exports = {
  invalidateTranslatedHebrew,
  getHayomYomByHebrewDate,
  upsertHayomYomEntry,
  ensureHayomYomForDate,
  translateText,
};
