const https = require('https');

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

function pickLang(values, lang) {
  if (!values) {
    return '';
  }

  if (lang === 'he' && values.he) {
    return values.he;
  }

  if (lang === 'ru' && values.ru) {
    return values.ru;
  }

  return values.en || values.he || values.ru || '';
}

function findSefariaItem(items, titleEn) {
  return (items || []).find((item) => item.title && item.title.en === titleEn) || null;
}

function mapSefariaItem(item, lang) {
  if (!item) {
    return null;
  }

  const display = item.displayValue || {};
  const ref = item.url || item.ref || '';
  const href = ref.startsWith('http') ? ref : (ref ? `https://www.sefaria.org/${ref}` : '');

  return {
    label: pickLang({
      en: display.en,
      he: display.he,
      ru: display.en,
    }, lang),
    ref: href,
  };
}

function mapTorahCalcEntry(entry, lang) {
  if (!entry) {
    return null;
  }

  return {
    label: pickLang({
      en: entry.name,
      he: entry.hebrewName,
      ru: entry.name,
    }, lang),
    ref: entry.url || '',
  };
}

async function getDailyLearning(lang = 'ru') {
  const [torahcalc, sefaria] = await Promise.all([
    fetchJson('https://www.torahcalc.com/api/dailylearning'),
    fetchJson('https://www.sefaria.org/api/calendars'),
  ]);

  const items = sefaria.calendar_items || [];
  const data = torahcalc.data || {};

  return {
    date: data.date || formatIsoDate(new Date()),
    chumash: mapSefariaItem(findSefariaItem(items, 'Chok LeYisrael'), lang)
      || mapSefariaItem(findSefariaItem(items, 'Parashat Hashavua'), lang),
    tehillim: mapTorahCalcEntry(data.dailyPsalms, lang),
    tanya: mapSefariaItem(findSefariaItem(items, 'Tanya Yomi'), lang),
    rambam: mapTorahCalcEntry(data.dailyRambam, lang),
    hayomYom: {
      available: false,
      messageKey: 'hayom_yom_unavailable',
      links: {
        en: 'https://www.chabad.org/dailystudy/hayomyom.asp',
        he: 'https://he.chabad.org/dailystudy/hayomyom.htm',
        ruBook: 'https://jewishbook.com.ua/novie_knigi/iudaizm_i_mudrecu/shneerson/gayom-yom-segodnya-den.html',
      },
    },
  };
}

async function getUpcomingHolidays(lang = 'ru', daysAhead = 120) {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  const hebcalLang = lang === 'he' ? 'he' : 'en';
  const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&nx=on&start=${formatIsoDate(start)}&end=${formatIsoDate(end)}&lg=${hebcalLang}`;

  const payload = await fetchJson(url);
  const today = formatIsoDate(start);

  return (payload.items || [])
    .filter((item) => item.category === 'holiday' && item.date >= today)
    .slice(0, 12)
    .map((item) => ({
      date: item.date,
      title: pickLang({
        en: item.title,
        he: item.hebrew || item.title,
        ru: item.title,
      }, lang),
      hebrew: item.hebrew || '',
      subcat: item.subcat || '',
      link: item.link || '',
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

  const [dailyLearning, upcomingHolidays] = await Promise.all([
    cached(`daily-learning:${safeLang}`, () => getDailyLearning(safeLang)),
    cached(`holidays:${safeLang}`, () => getUpcomingHolidays(safeLang)),
  ]);

  return {
    dailyLearning,
    upcomingHolidays,
  };
}

module.exports = {
  getJewishFeed,
  getDailyLearning,
  getUpcomingHolidays,
};
