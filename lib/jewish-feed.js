const https = require('https');
const Hebcal = require('hebcal');
const { getHayomYomByHebrewDate, ensureHayomYomForDate } = require('./hayom-yom-store');
const { scrapeDailyLearning } = require('./lchaim-scraper');
const { getUpcomingChabadDates } = require('./chabad-dates');
const {
  pickLang,
  translateHolidayTitle,
  translateLearningLine,
  translateRambamLabel,
} = require('./jewish-translations');

const CACHE_MS = 60 * 60 * 1000;
const cache = new Map();

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SynagogueMemorialBoard/1.0 (+https://github.com/shneurGreenberg/synagogue-memorial-saas)',
      },
    }, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`HTTP ${response.statusCode}`));
        response.resume();
        return;
      }

      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getHebrewDateParts(date = new Date()) {
  const hdate = new Hebcal.HDate(date);
  return {
    month: hdate.getMonth(),
    day: hdate.getDate(),
  };
}

function mapLearningItem(label, lang) {
  return {
    label: translateLearningLine(label, lang),
  };
}

function mapRambamItem(label, hebrewLabel, lang) {
  const source = lang === 'he' && hebrewLabel ? hebrewLabel : label;
  return {
    label: translateRambamLabel(source, lang),
  };
}

async function getHayomYomContent(date, lang) {
  const { month, day } = getHebrewDateParts(date);
  let entry = await getHayomYomByHebrewDate(month, day);

  if (!entry || !entry.text?.en) {
    try {
      entry = await ensureHayomYomForDate(date, month, day);
    } catch {
      entry = entry || null;
    }
  }

  if (!entry) {
    return {
      available: false,
      text: '',
      lessons5703: null,
    };
  }

  const text = pickLang(entry.text, lang);
  const lessons = entry.lessons5703 || {};

  const lessonLabel = (field) => {
    const localized = pickLang(lessons[field], lang);
    if (localized) {
      return localized;
    }

    return translateLearningLine(pickLang(lessons[field], 'en'), lang);
  };

  return {
    available: Boolean(text),
    text,
    lessons5703: {
      chumash: { label: lessonLabel('chumash') },
      tehillim: { label: lessonLabel('tehillim') },
      tanya: { label: lessonLabel('tanya') },
    },
  };
}

function findSefariaItem(items, titleEn) {
  return (items || []).find((item) => item.title && item.title.en === titleEn) || null;
}

function mapSefariaLabel(item, lang) {
  if (!item) {
    return '';
  }

  const display = item.displayValue || {};
  if (lang === 'he' && display.he) {
    return display.he;
  }

  return display.en || display.he || '';
}

async function getDailyLearning(lang = 'ru') {
  const today = new Date();
  const [scraped, torahcalc, sefaria] = await Promise.all([
    scrapeDailyLearning(today).catch(() => null),
    fetchJson('https://www.torahcalc.com/api/dailylearning').catch(() => ({ data: {} })),
    fetchJson('https://www.sefaria.org/api/calendars').catch(() => ({ calendar_items: [] })),
  ]);

  const data = torahcalc.data || {};
  const sefariaItems = sefaria.calendar_items || [];
  const tanyaSefaria = findSefariaItem(sefariaItems, 'Tanya Yomi');
  const chokLeYisrael = findSefariaItem(sefariaItems, 'Chok LeYisrael');
  const parshaSefaria = findSefariaItem(sefariaItems, 'Parashat Hashavua');
  const tanakhYomi = findSefariaItem(sefariaItems, 'Tanakh Yomi');
  const lessons = scraped?.lessons5786 || {};

  const sefariaLang = lang === 'he' ? 'he' : 'en';
  const chumashLabel = lessons.chumash
    || data.dailyChumash?.name
    || mapSefariaLabel(chokLeYisrael, sefariaLang)
    || mapSefariaLabel(parshaSefaria, sefariaLang)
    || '';
  const tehillimFromTanakh = mapSefariaLabel(tanakhYomi, sefariaLang);
  const tehillimLabel = lessons.tehillim
    || data.dailyPsalms?.name
    || (tehillimFromTanakh && /psalm|תהילים|тегилим|tehillim/i.test(tehillimFromTanakh) ? tehillimFromTanakh : '')
    || tehillimFromTanakh
    || '';
  const tanyaLabel = translateLearningLine(
    mapSefariaLabel(tanyaSefaria, lang === 'he' ? 'he' : 'en')
      || lessons.tanya
      || '',
    lang,
  );
  const rambam1Label = lang === 'he'
    ? (scraped?.rambam1Title || data.dailyRambam?.hebrewName || data.dailyRambam?.name || '')
    : (data.dailyRambam?.name || lessons.rambam1 || scraped?.rambam1Title || '');
  const rambam3Label = lang === 'he'
    ? (scraped?.rambam3Title || data.dailyRambam3?.hebrewName || data.dailyRambam3?.name || '')
    : (data.dailyRambam3?.name || lessons.rambam3 || scraped?.rambam3Title || '');

  const hayomYom = await getHayomYomContent(today, lang);

  return {
    date: data.date || formatIsoDate(today),
    chumash: mapLearningItem(chumashLabel, lang),
    tehillim: mapLearningItem(tehillimLabel, lang),
    tanya: mapLearningItem(tanyaLabel, lang),
    rambam: mapRambamItem(rambam1Label, data.dailyRambam?.hebrewName, lang),
    rambam3: mapRambamItem(rambam3Label, data.dailyRambam3?.hebrewName, lang),
    hayomYom,
  };
}

async function getUpcomingHolidays(lang = 'ru', daysAhead = 365) {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  const hebcalLang = lang === 'he' ? 'he' : 'en';
  const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&nx=on&start=${formatIsoDate(start)}&end=${formatIsoDate(end)}&lg=${hebcalLang}`;

  const payload = await fetchJson(url);
  const today = formatIsoDate(start);

  return (payload.items || [])
    .filter((item) => item.category === 'holiday' && item.date >= today)
    .map((item) => ({
      date: item.date,
      title: translateHolidayTitle(item.title, lang),
      hebrew: item.hebrew || '',
      subcat: item.subcat || '',
      link: '',
    }));
}

async function cached(key, loader) {
  const now = Date.now();
  const hit = cache.get(key);

  if (hit && now - hit.at < CACHE_MS) {
    return hit.value;
  }

  const value = await loader();
  cache.set(key, { at: now, value });
  return value;
}

async function getJewishFeed(lang = 'ru') {
  const safeLang = ['ru', 'en', 'he'].includes(lang) ? lang : 'ru';

  const [dailyLearning, upcomingHolidays, chabadDates] = await Promise.all([
    cached(`daily-learning:${safeLang}`, () => getDailyLearning(safeLang)),
    cached(`holidays:${safeLang}`, () => getUpcomingHolidays(safeLang)),
    cached(`chabad-dates:${safeLang}`, () => Promise.resolve(getUpcomingChabadDates(safeLang))),
  ]);

  return {
    dailyLearning,
    upcomingHolidays,
    chabadDates,
  };
}

module.exports = {
  getJewishFeed,
  getDailyLearning,
  getUpcomingHolidays,
  getUpcomingChabadDates,
};
