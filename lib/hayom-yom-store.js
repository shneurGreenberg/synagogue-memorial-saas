const https = require('https');
const HayomYom = require('../models/HayomYom');
const { fetchHebrewAphorism } = require('./chabadlibrary-scraper');
const { scrapeDailyLearning } = require('./lchaim-scraper');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function translateText(text, langPair) {
  if (!text) {
    return Promise.resolve('');
  }

  const encoded = encodeURIComponent(text.slice(0, 450));
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${langPair}`;

  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'SynagogueMemorialBoard/1.0' },
    }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          const payload = JSON.parse(body);
          resolve(payload.responseData?.translatedText || text);
        } catch {
          resolve(text);
        }
      });
    }).on('error', () => resolve(text));
  });
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
  if (existing && existing.text?.en && existing.text?.ru) {
    return existing;
  }

  const scraped = await scrapeDailyLearning(date);
  let hebrewText = existing?.text?.he || '';

  if (!hebrewText) {
    hebrewText = await fetchHebrewAphorism(hebrewMonth, hebrewDay);
    await sleep(300);
  }

  const englishText = scraped.aphorism || existing?.text?.en || '';
  let russianText = existing?.text?.ru || '';

  if (!russianText && englishText) {
    russianText = await translateText(englishText, 'en|ru');
    await sleep(400);
  }

  const lessons5703 = {
    chumash: {
      en: scraped.lessons5703.chumash || existing?.lessons5703?.chumash?.en || '',
      he: existing?.lessons5703?.chumash?.he || '',
      ru: existing?.lessons5703?.chumash?.ru
        || await translateText(scraped.lessons5703.chumash, 'en|ru'),
    },
    tehillim: {
      en: scraped.lessons5703.tehillim || existing?.lessons5703?.tehillim?.en || '',
      he: existing?.lessons5703?.tehillim?.he || '',
      ru: existing?.lessons5703?.tehillim?.ru
        || await translateText(scraped.lessons5703.tehillim, 'en|ru'),
    },
    tanya: {
      en: scraped.lessons5703.tanya || existing?.lessons5703?.tanya?.en || '',
      he: existing?.lessons5703?.tanya?.he || '',
      ru: existing?.lessons5703?.tanya?.ru
        || await translateText(scraped.lessons5703.tanya, 'en|ru'),
    },
  };

  return upsertHayomYomEntry(hebrewMonth, hebrewDay, {
    text: {
      en: englishText,
      he: hebrewText,
      ru: russianText,
    },
    lessons5703,
  });
}

module.exports = {
  getHayomYomByHebrewDate,
  upsertHayomYomEntry,
  ensureHayomYomForDate,
  translateText,
};
