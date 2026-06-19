require('dotenv').config();
const mongoose = require('mongoose');
const Hebcal = require('hebcal');
const HayomYom = require('../models/HayomYom');
const { scrapeDailyLearning } = require('../lib/lchaim-scraper');
const { fetchHebrewAphorism } = require('../lib/chabadlibrary-scraper');
const { translateText, upsertHayomYomEntry } = require('../lib/hayom-yom-store');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function collectHebrewDates(year) {
  const seen = new Set();
  const dates = [];

  for (let month = 0; month < 12; month += 1) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const gregorian = new Date(year, month, day);
      const hdate = new Hebcal.HDate(gregorian);
      const key = `${hdate.getMonth()}-${hdate.getDate()}`;

      if (!seen.has(key)) {
        seen.add(key);
        dates.push({
          gregorian,
          hebrewMonth: hdate.getMonth(),
          hebrewDay: hdate.getDate(),
        });
      }
    }
  }

  return dates;
}

async function seedEntry({ gregorian, hebrewMonth, hebrewDay }) {
  const existing = await HayomYom.findOne({ hebrewMonth, hebrewDay }).lean();
  if (existing?.text?.en && existing?.text?.ru && existing?.text?.he) {
    return { skipped: true };
  }

  const scraped = await scrapeDailyLearning(gregorian);
  const hebrewText = existing?.text?.he || await fetchHebrewAphorism(hebrewMonth, hebrewDay);
  const englishText = scraped.aphorism || existing?.text?.en || '';

  let russianText = existing?.text?.ru || '';
  if (!russianText && englishText) {
    russianText = await translateText(englishText, 'en|ru');
    await sleep(500);
  }

  const lessons5703 = {
    chumash: {
      en: scraped.lessons5703.chumash || existing?.lessons5703?.chumash?.en || '',
      he: existing?.lessons5703?.chumash?.he || '',
      ru: existing?.lessons5703?.chumash?.ru
        || (scraped.lessons5703.chumash ? await translateText(scraped.lessons5703.chumash, 'en|ru') : ''),
    },
    tehillim: {
      en: scraped.lessons5703.tehillim || existing?.lessons5703?.tehillim?.en || '',
      he: existing?.lessons5703?.tehillim?.he || '',
      ru: existing?.lessons5703?.tehillim?.ru
        || (scraped.lessons5703.tehillim ? await translateText(scraped.lessons5703.tehillim, 'en|ru') : ''),
    },
    tanya: {
      en: scraped.lessons5703.tanya || existing?.lessons5703?.tanya?.en || '',
      he: existing?.lessons5703?.tanya?.he || '',
      ru: existing?.lessons5703?.tanya?.ru
        || (scraped.lessons5703.tanya ? await translateText(scraped.lessons5703.tanya, 'en|ru') : ''),
    },
  };

  await upsertHayomYomEntry(hebrewMonth, hebrewDay, {
    text: {
      en: englishText,
      he: hebrewText,
      ru: russianText,
    },
    lessons5703,
  });

  return {
    skipped: false,
    hebrewMonth,
    hebrewDay,
    hasHebrew: Boolean(hebrewText),
    hasEnglish: Boolean(englishText),
    hasRussian: Boolean(russianText),
  };
}

async function main() {
  const year = Number(process.argv[2]) || new Date().getFullYear();
  const limit = Number(process.argv[3]) || 0;

  mongoose.set('strictQuery', false);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const dates = collectHebrewDates(year);
  const targets = limit > 0 ? dates.slice(0, limit) : dates;

  console.log(`Seeding ${targets.length} Hayom Yom entries for year ${year}...`);

  let seeded = 0;
  let skipped = 0;

  for (const entry of targets) {
    try {
      const result = await seedEntry(entry);
      if (result.skipped) {
        skipped += 1;
        console.log(`skip ${entry.hebrewMonth}/${entry.hebrewDay}`);
      } else {
        seeded += 1;
        console.log(`seed ${entry.hebrewMonth}/${entry.hebrewDay} en=${result.hasEnglish} he=${result.hasHebrew} ru=${result.hasRussian}`);
      }
    } catch (err) {
      console.error(`failed ${entry.hebrewMonth}/${entry.hebrewDay}:`, err.message);
    }

    await sleep(700);
  }

  console.log(`Done. Seeded: ${seeded}, skipped: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
