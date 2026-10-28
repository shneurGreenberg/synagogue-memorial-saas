const https = require('https');
const Hebcal = require('hebcal');
const { getHayomYomByHebrewDate, ensureHayomYomForDate, upsertHayomYomEntry } = require('./hayom-yom-store');
const { translateWithCache } = require('./mymemory-translate');

const HEBREW_RE = /[\u0590-\u05FF]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;

function splitForTranslation(text, max = 450) {
  const sentences = String(text || '').match(/[^.!?]+[.!?]*\s*/g) || [String(text || '')];
  const chunks = [];
  let current = '';
  sentences.forEach((sentence) => {
    if ((current + sentence).length > max && current) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
  });
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function extractChatContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map((part) => (part && (part.text || part.content)) || '').join('').trim();
  return '';
}

function shortBody(text) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, 200);
}

async function translateViaOpenRouter(text, lang, env = process.env, fetchImpl = globalThis.fetch) {
  const apiKey = String(env.OPENROUTER_API_KEY || '').trim();
  if (!text) return '';
  if (!apiKey) {
    console.warn('Hayom Yom OpenRouter: OPENROUTER_API_KEY is not set');
    return '';
  }
  if (typeof fetchImpl !== 'function') return '';
  const target = lang === 'ru' ? 'Russian' : 'Hebrew';
  const model = String(env.TRANSLATE_MODEL || 'google/gemini-3.8-flash').trim();
  try {
    const res = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.OPENROUTER_SITE_URL || 'https://synagogue-kadish-waw-shneur.waw0.amvera.tech',
        'X-Title': env.OPENROUTER_APP_NAME || 'Kadish board',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: `Translate the user's text (a Chabad "Hayom Yom" daily teaching) into ${target}. Output only the translation, no notes.` },
          { role: 'user', content: String(text).slice(0, 4000) },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.warn(`Hayom Yom OpenRouter HTTP ${res.status} model=${model}: ${shortBody(raw)}`);
      return '';
    }
    let data;
    try { data = JSON.parse(raw); } catch { console.warn(`Hayom Yom OpenRouter bad JSON: ${shortBody(raw)}`); return ''; }
    const out = extractChatContent(data);
    if (!out) console.warn(`Hayom Yom OpenRouter empty content model=${model}: ${shortBody(raw)}`);
    return out;
  } catch (err) {
    console.warn(`Hayom Yom OpenRouter failed model=${model}: ${err.name} ${err.message}`);
    return '';
  }
}

async function translateHayomYom(englishText, hebrewMonth, hebrewDay, lang = 'he') {
  const scriptRe = lang === 'ru' ? CYRILLIC_RE : HEBREW_RE;
  try {
    const parts = [];
    for (const chunk of splitForTranslation(englishText)) {
      const translated = await translateWithCache(chunk, `en|${lang}`, { validate: (v) => scriptRe.test(v || '') });
      if (!scriptRe.test(translated || '')) {
        parts.length = 0;
        break;
      }
      parts.push(translated.trim());
    }
    let joined = parts.join(' ');
    if (!joined) {
      // 1.29.3: MyMemory/Google are unreliable from the hosting network; use OpenRouter (already configured for scans).
      joined = await translateViaOpenRouter(englishText, lang);
      if (!scriptRe.test(joined || '')) {
        console.warn(`Hayom Yom ${lang} translation unavailable from all providers`);
        return '';
      }
    }
    const text = getHayomYomDisplayText(joined);
    if (text && scriptRe.test(text)) {
      const entry = await getHayomYomByHebrewDate(hebrewMonth, hebrewDay);
      if (entry) {
        await upsertHayomYomEntry(hebrewMonth, hebrewDay, {
          text: { ...(entry.text || {}), [lang]: text },
          lessons5703: entry.lessons5703,
        });
      }
      return text;
    }
  } catch (err) {
    console.error(`Hayom Yom ${lang} translation failed:`, err.message);
  }
  return '';
}
const { getHayomYomDisplayText } = require('./hayom-yom-display-text');
const { sanitizeHayomYomText } = require('./hayom-yom-sanitize');
const { isChabadDatesEnabled } = require('./board-features');
const { scrapeDailyLearning } = require('./lchaim-scraper');
const { getUpcomingChabadDates } = require('./chabad-dates');
const {
  getGregorianDateInTimezone,
  getHebrewDateInTimezone,
  getDayKeyInTimezone,
  resolveSynagogueTimezone,
} = require('./yahrzeit');
const {
  pickLang,
  translateLearningLine,
  translateRambamLabel,
} = require('./jewish-translations');
const {
  localizeFromLocalizedFields,
  localizePlainLearningLabel,
  mapLearningItem,
} = require('./learning-label-i18n');
const { resolveDailyChumashLabel } = require('./daily-chumash-label');
const { formatTanyaRef, resolveDailyTanyaLabel } = require('./daily-tanya-label');
const { processUpcomingHebcalHolidays } = require('./upcoming-holidays');

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

function getHebrewDateParts(date = new Date(), timezone) {
  const hdate = timezone
    ? getHebrewDateInTimezone(timezone, date)
    : new Hebcal.HDate(date);

  return {
    month: hdate.getMonth(),
    day: hdate.getDate(),
  };
}

async function mapRambamItem(label, hebrewLabel, lang) {
  const source = lang === 'he' && hebrewLabel ? hebrewLabel : label;
  const viaDict = translateRambamLabel(source, lang);
  if (lang === 'he' && hebrewLabel) {
    return { label: viaDict };
  }
  return {
    label: await localizePlainLearningLabel(viaDict, lang),
  };
}

async function getHayomYomContent(date, lang, timezone) {
  const { month, day } = getHebrewDateParts(date, timezone);
  let entry = await getHayomYomByHebrewDate(month, day);

  // 1.29 H1: Hebrew boards need the Hebrew aphorism; re-fetch when it is missing.
  if (!entry || !entry.text?.en) {
    try {
      entry = await ensureHayomYomForDate(date, month, day);
    } catch (err) {
      console.error('Hayom Yom fetch failed:', err.message);
      entry = entry || null;
    }
  }

  if (!entry) {
    return {
      available: false,
      text: '',
      lessons5703: null,
      hebrewMonth: month,
      hebrewDay: day,
    };
  }

  const englishText = getHayomYomDisplayText(pickLang(entry.text, 'en'));
  const hebrewText = getHayomYomDisplayText(pickLang(entry.text, 'he'));
  const sourceFallback = lang === 'he' ? hebrewText : englishText;
  let text = getHayomYomDisplayText(
    await localizeFromLocalizedFields(entry.text, lang),
    sourceFallback,
  );
  if (!text && englishText && lang === 'en') {
    text = englishText;
  }
  // 1.29 H1: never show non-Hebrew text on a Hebrew board.
  if (lang === 'he' && !/[\u0590-\u05FF]/.test(text || '')) {
    text = /[\u0590-\u05FF]/.test(hebrewText || '') ? hebrewText : '';
    // 1.29.1: the Hebrew sources (chabad.org, chabadlibrary via Wayback) are blocked/empty,
    // so translate the English aphorism and persist it instead of leaving the panel empty.
    if (!text && englishText) {
      text = await translateHayomYom(englishText, month, day, 'he');
    }
    // 1.29.4: Shneur prefers content over an empty panel — show English when no Hebrew is available.
    if (!text && englishText) {
      text = englishText;
    }
  }
  // 1.29.1: Russian boards must be Russian-only too (stored ru was sometimes English).
  if (lang === 'ru' && text && !CYRILLIC_RE.test(text) && englishText) {
    text = (await translateHayomYom(englishText, month, day, 'ru')) || '';
  }
  const lessons = entry.lessons5703 || {};

  const lessonLabel = async (field) => localizeFromLocalizedFields(lessons[field], lang);

  return {
    available: Boolean(text),
    text,
    hebrewMonth: month,
    hebrewDay: day,
    lessons5703: {
      chumash: { label: await lessonLabel('chumash') },
      tehillim: { label: await lessonLabel('tehillim') },
      tanya: { label: await lessonLabel('tanya') },
    },
  };
}

function findSefariaItem(items, titleEn) {
  return (items || []).find((item) => item.title && item.title.en === titleEn) || null;
}

function mapTorahCalcLabel(entry, lang) {
  if (!entry) {
    return '';
  }

  if (lang === 'he' && entry.hebrewName) {
    return entry.hebrewName;
  }

  return entry.name || entry.hebrewName || '';
}

async function getDailyLearning(lang = 'ru', timezone = 'Asia/Jerusalem', now = new Date()) {
  const today = getGregorianDateInTimezone(timezone, now);
  const dateParam = formatIsoDate(today);
  const [scraped, torahcalc, sefaria] = await Promise.all([
    scrapeDailyLearning(today).catch(() => null),
    fetchJson(`https://www.torahcalc.com/api/dailylearning?date=${dateParam}&diaspora=true`).catch(() => ({ data: {} })),
    fetchJson('https://www.sefaria.org/api/calendars').catch(() => ({ calendar_items: [] })),
  ]);

  const data = torahcalc.data || {};
  const sefariaItems = sefaria.calendar_items || [];
  const tanyaSefaria = findSefariaItem(sefariaItems, 'Tanya Yomi');
  const chokLeYisraelSefaria = findSefariaItem(sefariaItems, 'Chok LeYisrael');
  const lessons5786 = scraped?.lessons5786 || {};
  const hayomYom = await getHayomYomContent(today, lang, timezone);

  const chumashLabel = resolveDailyChumashLabel({
    timezone,
    now,
    lessons5786Chumash: lessons5786.chumash,
    hayomYomChumashLabel: hayomYom.lessons5703?.chumash?.label,
    chokLeYisraelSefaria,
    lang,
  });
  const tehillimLabel = lessons5786.tehillim
    || mapTorahCalcLabel(data.dailyPsalms, lang)
    || '';
  const tanyaLang = lang === 'he' ? 'he' : lang === 'ru' ? 'ru' : 'en';
  const tanyaLabelFromRef = tanyaSefaria?.ref
    ? formatTanyaRef(tanyaSefaria.ref, tanyaLang)
    : '';
  const tanyaLabel = resolveDailyTanyaLabel({
    sefariaItem: tanyaSefaria,
    lessons5786Tanya: lessons5786.tanya,
    hayomYomTanyaLabel: hayomYom.lessons5703?.tanya?.label,
    lang: tanyaLang,
  });
  const tanyaItem = tanyaLabelFromRef && tanyaLabel === tanyaLabelFromRef
    ? { label: tanyaLabel }
    : await mapLearningItem(translateLearningLine(tanyaLabel, lang), lang);
  const rambam1Label = lang === 'he'
    ? (scraped?.rambam1Title || data.dailyRambam?.hebrewName || data.dailyRambam?.name || '')
    : (data.dailyRambam?.name || lessons5786.rambam1 || scraped?.rambam1Title || '');
  const rambam3Label = lang === 'he'
    ? (scraped?.rambam3Title || data.dailyRambam3?.hebrewName || data.dailyRambam3?.name || '')
    : (data.dailyRambam3?.name || lessons5786.rambam3 || scraped?.rambam3Title || '');

  return {
    date: data.date || dateParam,
    timezone,
    chumash: await mapLearningItem(chumashLabel, lang),
    tehillim: await mapLearningItem(tehillimLabel, lang),
    tanya: tanyaItem,
    rambam: await mapRambamItem(rambam1Label, data.dailyRambam?.hebrewName, lang),
    rambam3: await mapRambamItem(rambam3Label, data.dailyRambam3?.hebrewName, lang),
    hayomYom,
  };
}

async function getUpcomingHolidays(lang = 'ru', daysAhead = 30, limit = 20) {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  const hebcalLang = lang === 'he' ? 'he' : 'en';
  const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&mf=on&nx=on&start=${formatIsoDate(start)}&end=${formatIsoDate(end)}&lg=${hebcalLang}`;

  const payload = await fetchJson(url);
  const today = formatIsoDate(start);

  return processUpcomingHebcalHolidays(payload.items || [], lang, today, limit);
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

async function getJewishFeed(lang = 'ru', synagogue = null, now = new Date()) {
  const safeLang = ['ru', 'en', 'he'].includes(lang) ? lang : 'ru';
  const timezone = resolveSynagogueTimezone(synagogue);
  const dayKey = getDayKeyInTimezone(timezone, now);

  const showChabadDates = isChabadDatesEnabled(synagogue?.boardFeatures);

  const [dailyLearning, upcomingHolidays, chabadDates] = await Promise.all([
    cached(`daily-learning:${safeLang}:${timezone}:${dayKey}`, () => getDailyLearning(safeLang, timezone, now)),
    cached(`holidays:${safeLang}:${dayKey}`, () => getUpcomingHolidays(safeLang)),
    cached(`chabad-dates:${safeLang}:${dayKey}`, () => Promise.resolve(
      showChabadDates ? getUpcomingChabadDates(safeLang) : [],
    )),
  ]);

  return {
    date: dayKey,
    timezone,
    dailyLearning,
    upcomingHolidays,
    chabadDates: showChabadDates ? chabadDates : [],
  };
}

module.exports = {
  translateViaOpenRouter,
  extractChatContent,
  getJewishFeed,
  getDailyLearning,
  getUpcomingHolidays,
  getUpcomingChabadDates,
};
