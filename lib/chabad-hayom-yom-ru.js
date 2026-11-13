/**
 * 1.37.0 I79: official Russian «Айом Йом» from ru.chabad.org (same page structure as the English
 * www.chabad.org page). The Russian text replaces the machine translation; the machine
 * translation (MyMemory / OpenRouter) stays only as a fallback when this fetch fails.
 *
 * Page structure (dailystudy/hayomyom.asp?tdate=M/D/YYYY): one or more
 * <div class="hayom-yom-container"> blocks, each with
 *   - .hayom-yom-native  → <co:body><div class="co_body article-body">Russian paragraphs (with
 *                          footnote_ref anchors)</div></co:body> + a footnote table («ПРИМЕЧАНИЯ»)
 *   - .hayom-yom-hebrew  → the Hebrew lesson table (date row «ג אדר א» / «ג אדר שני») + Hebrew text.
 * In a regular (non-leap) year the page shows TWO blocks in Adar: «אדר א» and «אדר שני». The plain
 * Adar of a regular year is Adar II (Purim, yahrzeits and the Chabad custom follow Adar II), and the
 * Adar II entry continues the Adar II day-by-day series (e.g. «см. 20 Адара II»).
 */
const https = require('https');
const { sanitizeHayomYomText } = require('./hayom-yom-sanitize');
const { formatChabadDate } = require('./chabad-hayom-yom-scraper');

const SOURCE = 'ru.chabad.org';

const NAMED_ENTITIES = {
  nbsp: ' ', quot: '"', amp: '&', lt: '<', gt: '>', apos: "'",
  laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…',
  bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', shy: '',
};

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => (
      Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name.toLowerCase())
        ? NAMED_ENTITIES[name.toLowerCase()]
        : m
    ));
}

function htmlToText(html) {
  return decodeEntities(String(html || '')
    .replace(/<a[^>]*class="[^"]*footnote_ref[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** Split the page into its hayom-yom blocks: [{ ru, hebrewDateLabel }]. */
function parseRussianHayomYomBlocks(html) {
  const source = String(html || '');
  const parts = source.split(/<div class="hayom-yom-container">/i).slice(1);
  return parts.map((part) => {
    const nativeStart = part.search(/class="hayom-yom-native\b/i);
    const hebrewStart = part.search(/class="hayom-yom-hebrew\b/i);
    const nativeHtml = nativeStart >= 0
      ? part.slice(nativeStart, hebrewStart > nativeStart ? hebrewStart : undefined)
      : '';
    // Russian text = the co_body article only; the footnote table («ПРИМЕЧАНИЯ») is dropped.
    const bodyMatch = nativeHtml.match(/<div class="co_body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/co:body>/i);
    const ruHtml = bodyMatch ? bodyMatch[1] : '';
    const hebrewHtml = hebrewStart >= 0 ? part.slice(hebrewStart) : '';
    const dateRow = hebrewHtml.match(/<tr class="hayom-yom-date">([\s\S]*?)<\/tr>/i);
    let hebrewDateLabel = '';
    if (dateRow) {
      const cells = dateRow[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      hebrewDateLabel = cells[1] ? htmlToText(cells[1]) : htmlToText(dateRow[1]);
    }
    return { ru: htmlToText(ruHtml), hebrewDateLabel };
  }).filter((block) => block.ru);
}

function adarVariantOfLabel(label) {
  const value = String(label || '');
  if (/אדר\s*(שני|ב['׳]?)(\s|$)/.test(value)) return 'adar2';
  if (/אדר\s*(ראשון|א['׳]?)(\s|$)/.test(value)) return 'adar1';
  return '';
}

/**
 * Which Adar entry belongs to (hebcal month, Hebrew leap year)?
 * hebcal: 12 = Adar (regular year) / Adar I (leap year), 13 = Adar II.
 */
function expectedAdarVariant(hebrewMonth, isLeapYear) {
  if (Number(hebrewMonth) === 13) return 'adar2';
  if (Number(hebrewMonth) === 12) return isLeapYear ? 'adar1' : 'adar2';
  return '';
}

function pickRussianHayomYom(blocks, wantedVariant = '') {
  const list = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return null;
  if (wantedVariant) {
    const match = list.find((block) => adarVariantOfLabel(block.hebrewDateLabel) === wantedVariant);
    if (match) return match;
    // A regular-year page always has both; if labels are missing, Adar II is the second block.
    if (list.length > 1) return wantedVariant === 'adar2' ? list[list.length - 1] : list[0];
  }
  return list[0];
}

/** Clean Russian text for the board; '' when the page only has a "hard to translate" note. */
function extractRussianHayomYom(html, { hebrewMonth, isLeapYear } = {}) {
  const blocks = parseRussianHayomYomBlocks(html);
  const block = pickRussianHayomYom(blocks, expectedAdarVariant(hebrewMonth, isLeapYear));
  if (!block) return { text: '', variant: '', untranslated: false };
  const text = sanitizeHayomYomText(block.ru);
  const untranslated = isRussianPlaceholder(text);
  return {
    text: untranslated ? '' : text,
    variant: adarVariantOfLabel(block.hebrewDateLabel) || expectedAdarVariant(hebrewMonth, isLeapYear),
    untranslated,
  };
}

// The Russian site marks a few days (Hebrew grammar / word-play) as not translatable.
function isRussianPlaceholder(text) {
  const value = String(text || '').trim();
  if (!value) return true;
  if (!/[\u0400-\u04FF]/.test(value)) return true;
  if (value.length < 400 && /(трудно|невозможно|нельзя)\s+перевест|не\s+(может\s+быть\s+)?переведен|не\s+переводится|непереводим/i.test(value)) {
    return true;
  }
  return false;
}

function fetchRussianHayomYomHtml(date, { timeoutMs = 15000 } = {}) {
  const url = `https://ru.chabad.org/dailystudy/hayomyom.asp?tdate=${formatChabadDate(date)}`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SynagogueMemorialBoard/1.0; +https://synagogue-kadish-waw-shneur.waw0.amvera.tech)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru,en;q=0.5',
      },
      timeout: timeoutMs,
    }, (response) => {
      if (response.statusCode && response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.setEncoding('utf8');
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve(body));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// Failed fetches (e.g. Cloudflare 403) are not retried for a while per Hebrew day.
const FAILURE_BACKOFF_MS = 6 * 60 * 60 * 1000;
const failures = new Map();
let lastStatus = { ok: null, at: null, error: '' };

async function fetchRussianHayomYom(date, { hebrewMonth, hebrewDay, isLeapYear, force = false } = {}) {
  const key = `${hebrewMonth}-${hebrewDay}-${isLeapYear ? 'L' : 'R'}`;
  const failedAt = failures.get(key);
  if (!force && failedAt && Date.now() - failedAt < FAILURE_BACKOFF_MS) {
    return { text: '', variant: '', untranslated: false, skipped: true };
  }
  try {
    const html = await fetchRussianHayomYomHtml(date);
    const result = extractRussianHayomYom(html, { hebrewMonth, isLeapYear });
    lastStatus = { ok: Boolean(result.text || result.untranslated), at: new Date().toISOString(), error: result.text || result.untranslated ? '' : 'no text in page' };
    if (!result.text && !result.untranslated) failures.set(key, Date.now());
    else failures.delete(key);
    return result;
  } catch (err) {
    failures.set(key, Date.now());
    lastStatus = { ok: false, at: new Date().toISOString(), error: String(err && err.message || err) };
    throw err;
  }
}

function russianHayomYomStatus() {
  return { ...lastStatus };
}

module.exports = {
  SOURCE,
  parseRussianHayomYomBlocks,
  extractRussianHayomYom,
  expectedAdarVariant,
  adarVariantOfLabel,
  pickRussianHayomYom,
  isRussianPlaceholder,
  fetchRussianHayomYom,
  russianHayomYomStatus,
  _failures: failures,
};
