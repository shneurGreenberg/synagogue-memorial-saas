const https = require('https');
const zlib = require('zlib');

// 1.29.5 I6: original Hebrew Hayom Yom from chabadlibrary.org JSON API (no translation).
const API_BASE = 'https://chabadlibrary.org/books/api/main?path=';
const ROOT_ID = '3700000000';
const SOURCE = 'chabadlibrary';

// hebcal month numbers: 1 Nisan ... 7 Tishrei, 8 Cheshvan, 9 Kislev, 10 Tevet, 11 Shvat, 12 Adar/Adar I, 13 Adar II
const MONTH_TITLES = {
  1: ['ניסן'],
  2: ['אייר'],
  3: ['סיון', 'סיוון'],
  4: ['תמוז'],
  5: ['מנחם אב', 'אב'],
  6: ['אלול'],
  7: ['תשרי'],
  8: ['חשון', 'חשוון', 'מרחשון', 'מרחשוון'],
  9: ['כסלו'],
  10: ['טבת'],
  11: ['שבט'],
  12: ['אדר א'],
  13: ['אדר ב'],
};

const idCache = new Map();

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (SynagogueMemorialBoard/1.0)',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 15000,
    }, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const enc = String(response.headers['content-encoding'] || '').toLowerCase();
      let stream = response;
      if (enc === 'gzip') stream = response.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = response.pipe(zlib.createInflate());
      else if (enc === 'br') stream = response.pipe(zlib.createBrotliDecompress());
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function fetchNode(id, fetchImpl = fetchText) {
  const text = await fetchImpl(`${API_BASE}${id}`);
  const json = JSON.parse(text);
  return json && json.content ? json.content : null;
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&amp;/g, '&');
}

function stripHtml(html) {
  return decodeEntities(String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function normTitle(s) {
  return stripHtml(s).replace(/["'״׳]/g, '').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function dayToHebrew(n) {
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל'];
  return tens[Math.floor(n / 10)] + ones[n % 10];
}

function isLeapYear(year) {
  return ((7 * Number(year) + 1) % 19) < 7;
}

function monthTitlesFor(month, year) {
  if (month === 12 && year && !isLeapYear(year)) return ['אדר ב', 'אדר'];
  return MONTH_TITLES[month] || [];
}

function hebrewMonthToFolder(month) {
  return MONTH_TITLES[month] ? month : null;
}

async function findMonthIds(month, year, fetchImpl) {
  const titles = monthTitlesFor(month, year);
  const key = `m:${titles.join('|')}`;
  if (idCache.has(key)) return idCache.get(key);
  const root = await fetchNode(ROOT_ID, fetchImpl);
  const ids = (root?.data || [])
    .filter((m) => titles.includes(normTitle(m.heading)))
    .map((m) => m.id);
  if (ids.length) idCache.set(key, ids);
  return ids;
}

async function findDayId(month, day, year, fetchImpl) {
  const key = `d:${month}:${day}:${month === 12 && year && !isLeapYear(year) ? 'plain' : ''}`;
  if (idCache.has(key)) return idCache.get(key);
  const dayLetters = dayToHebrew(day);
  const monthIds = await findMonthIds(month, year, fetchImpl);
  for (const monthId of monthIds) {
    const node = await fetchNode(monthId, fetchImpl);
    const hit = (node?.data || []).find((d) => normTitle(d.heading).split(' ')[0] === dayLetters);
    if (hit) {
      idCache.set(key, hit.id);
      return hit.id;
    }
  }
  return null;
}

async function fetchHebrewAphorism(hebrewMonth, hebrewDay, options = {}) {
  const fetchImpl = options.fetchImpl || fetchText;
  try {
    const id = await findDayId(Number(hebrewMonth), Number(hebrewDay), options.year, fetchImpl);
    if (!id) return '';
    const node = await fetchNode(id, fetchImpl);
    if (!node || node.type !== 'page') return '';
    return stripHtml(node.data?.text || '');
  } catch (err) {
    console.warn('Hayom Yom chabadlibrary fetch failed:', err.message);
    return '';
  }
}

function extractHebrewText(html) {
  return stripHtml(html);
}

module.exports = {
  SOURCE,
  hebrewMonthToFolder,
  fetchHebrewAphorism,
  extractHebrewText,
  stripHtml,
  dayToHebrew,
  isLeapYear,
  _idCache: idCache,
};
