/**
 * 1.35.0 I57: Hebrew Hayom Yom text from luach.day (all 383 entries).
 *
 * chabadlibrary.org often stores the day's original in Yiddish; Hebrew boards should show the
 * Hebrew translation published at https://luach.day/hayom-yom/{month}-{day}/ instead of machine
 * translation. On fetch failure we fall back to the existing chabadlibrary / stored text.
 *
 * Month slugs (verified): tishrei, cheshvan, kislev, tevet, shevat, adar, adar-ii,
 * nissan, iyar, sivan, tammuz, av, elul.
 * Hebcal months: 1=Nisan … 6=Elul, 7=Tishrei … 11=Shvat, 12=Adar/Adar I, 13=Adar II.
 */
const https = require('https');
const zlib = require('zlib');

const SOURCE = 'luach.day';
const BASE = 'https://luach.day/hayom-yom';

const HEBCAL_MONTH_TO_SLUG = {
  1: 'nissan',
  2: 'iyar',
  3: 'sivan',
  4: 'tammuz',
  5: 'av',
  6: 'elul',
  7: 'tishrei',
  8: 'cheshvan',
  9: 'kislev',
  10: 'tevet',
  11: 'shevat',
  12: 'adar',
  13: 'adar-ii',
};

function monthSlugForHebcal(month) {
  return HEBCAL_MONTH_TO_SLUG[Number(month)] || '';
}

function luachDayUrl(hebrewMonth, hebrewDay) {
  const slug = monthSlugForHebcal(hebrewMonth);
  const day = Number(hebrewDay);
  if (!slug || !Number.isFinite(day) || day < 1 || day > 30) {
    return '';
  }
  return `${BASE}/${slug}-${day}/`;
}

function fetchText(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'SynagogueMemorialBoard/1.35 (HayomYom; +https://luach.day)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: timeoutMs,
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

function decodeJsonString(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function stripTags(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Prefer JSON-LD articleBody; fall back to the .hy-text paragraph.
 */
function parseLuachDayHayomYomHtml(html) {
  const raw = String(html || '');
  const jsonLd = raw.match(/"articleBody"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (jsonLd) {
    const text = decodeJsonString(jsonLd[1]).trim();
    if (text) return text;
  }
  const hy = raw.match(/class="hy-text"[^>]*>([\s\S]*?)<\/p>/i);
  if (hy) {
    const text = stripTags(hy[1]);
    if (text) return text;
  }
  return '';
}

/** Heuristic: Yiddish often mixes Hebrew letters with distinctive finals / no niqqud density; also Latin. */
function looksLikeYiddish(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  // Latin-script Yiddish transliteration
  if (/[A-Za-z]{4,}/.test(s) && !/[\u0590-\u05FF]/.test(s)) return true;
  // Distinctive Yiddish letters in Hebrew script (װ ױ ײ פּ פֿ תּ etc. / pasekh combinations hard).
  // Practical signal used in this codebase historically: chabadlibrary "Hebrew" that is mostly
  // Yiddish still has Hebrew letters, so for Hebrew boards we prefer luach.day whenever available.
  return /[\u05F0-\u05F4]/.test(s); // װ ױ ײ and geresh marks common in Yiddish orthography
}

async function fetchLuachDayHayomYom(hebrewMonth, hebrewDay, fetchImpl = fetchText) {
  const url = luachDayUrl(hebrewMonth, hebrewDay);
  if (!url) return '';
  const html = await fetchImpl(url);
  return parseLuachDayHayomYomHtml(html);
}

module.exports = {
  SOURCE,
  HEBCAL_MONTH_TO_SLUG,
  monthSlugForHebcal,
  luachDayUrl,
  parseLuachDayHayomYomHtml,
  looksLikeYiddish,
  fetchLuachDayHayomYom,
};
