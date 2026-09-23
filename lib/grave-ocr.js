/**
 * Gravestone OCR for the staff scan flow (/s/:slug/scan).
 *
 * Env (no secrets in the repo):
 * - GRAVE_OCR_PROVIDER  openrouter (default) | deepseek | gemini
 * - OPENROUTER_API_KEY  used when provider is openrouter
 * - GRAVE_OCR_MODEL     model id; OpenRouter default is deepseek/deepseek-v4.1-flash
 *                       (native image input). Do not use the text-only alias
 *                       ~deepseek/deepseek-v4-flash-latest.
 * - DEEPSEEK_API_KEY    used only when GRAVE_OCR_PROVIDER=deepseek
 * - GEMINI_API_KEY      used only when GRAVE_OCR_PROVIDER=gemini
 * - OPENROUTER_SITE_URL / OPENROUTER_APP_NAME  optional OpenRouter headers
 *
 * The provider switch is explicit. There is no automatic fallback between keys.
 */

const DEFAULT_OPENROUTER_MODEL = 'deepseek/deepseek-v4.1-flash';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const GRAVE_OCR_PROMPT = [
  'You read photographs of Jewish gravestones. Inscriptions are usually Russian (Cyrillic) and sometimes include Hebrew.',
  'A portrait photo often covers part of the stone. Read every visible letter, including text that is partly hidden beside or under the portrait.',
  'Do not invent names, dates, or epitaphs. If a field is unreadable, use an empty string or null.',
  'Return ONLY a JSON object with these keys:',
  '- name: deceased name in Russian as carved (family name and given name).',
  '- fatherNameOrPatronymic: patronymic or father\'s name if present, otherwise "".',
  '- gregorianDateOfDeath: civil date as {"year": number|null, "month": number|null, "date": number|null}. Month is 1-12. Use null for unknown parts. If only a Hebrew date is present, leave this null.',
  '- hebrewDateText: Hebrew date as written or transliterated, otherwise "".',
  '- epitaphOrBio: remaining epitaph or short biography in Russian, otherwise "".',
  '- rawText: all readable text from the stone, line breaks preserved.',
  '- confidence: number from 0 to 1 for the name and death date together.',
  'No markdown fences.',
].join('\n');

function resolveGraveOcrConfig(env = process.env) {
  const provider = String(env.GRAVE_OCR_PROVIDER || 'openrouter').trim().toLowerCase() || 'openrouter';

  if (provider === 'deepseek') {
    return {
      provider: 'deepseek',
      apiKey: String(env.DEEPSEEK_API_KEY || '').trim(),
      model: String(env.GRAVE_OCR_MODEL || env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL).trim(),
      url: DEEPSEEK_URL,
    };
  }

  if (provider === 'gemini') {
    const model = String(env.GRAVE_OCR_MODEL || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
    return {
      provider: 'gemini',
      apiKey: String(env.GEMINI_API_KEY || '').trim(),
      model,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    };
  }

  return {
    provider: 'openrouter',
    apiKey: String(env.OPENROUTER_API_KEY || '').trim(),
    model: String(env.GRAVE_OCR_MODEL || env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL).trim(),
    url: OPENROUTER_URL,
  };
}

function clampText(value, max) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function normalizeConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  const scaled = number > 1 ? number / 100 : number;
  return Math.max(0, Math.min(1, Math.round(scaled * 100) / 100));
}

function finitePart(value, min, max) {
  if (value == null || value === '') {
    return null;
  }
  const number = parseInt(value, 10);
  if (!Number.isFinite(number) || number < min || number > max) {
    return null;
  }
  return number;
}

const RU_MONTHS = {
  января: 1,
  январь: 1,
  февраля: 2,
  февраль: 2,
  марта: 3,
  март: 3,
  апреля: 4,
  апрель: 4,
  мая: 5,
  май: 5,
  июня: 6,
  июнь: 6,
  июля: 7,
  июль: 7,
  августа: 8,
  август: 8,
  сентября: 9,
  сентябрь: 9,
  октября: 10,
  октябрь: 10,
  ноября: 11,
  ноябрь: 11,
  декабря: 12,
  декабрь: 12,
};

function dateFromParts(year, month, date) {
  const normalized = {
    year: finitePart(year, 1800, 2100),
    month: finitePart(month, 1, 12),
    date: finitePart(date, 1, 31),
  };
  if (!normalized.year && !normalized.month && !normalized.date) {
    return null;
  }
  return normalized;
}

function normalizeGregorianDate(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && value >= 1800 && value <= 2100) {
    return { year: value, month: null, date: null };
  }

  if (typeof value === 'object') {
    return dateFromParts(
      value.year,
      value.month,
      value.date != null ? value.date : value.day,
    );
  }

  const text = String(value).trim();
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) {
    return dateFromParts(iso[1], iso[2], iso[3]);
  }

  const dmy = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmy) {
    return dateFromParts(dmy[3], dmy[2], dmy[1]);
  }

  const russian = text.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/);
  if (russian && RU_MONTHS[russian[2]]) {
    return dateFromParts(russian[3], RU_MONTHS[russian[2]], russian[1]);
  }

  const yearOnly = text.match(/\b(18|19|20)\d{2}\b/);
  if (yearOnly) {
    return dateFromParts(yearOnly[0], null, null);
  }

  return null;
}

function extractJsonObject(text) {
  const trimmed = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch (err) {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    const error = new Error('OCR response was not JSON');
    error.code = 'ocr_unreadable';
    throw error;
  }
}

function emptyGraveFields(rawText) {
  return {
    name: '',
    fatherNameOrPatronymic: '',
    gregorianDateOfDeath: null,
    hebrewDateText: '',
    epitaphOrBio: '',
    rawText: clampText(rawText, 4000),
    confidence: null,
  };
}

function parseGraveOcrResponse(text) {
  let parsed;
  try {
    parsed = extractJsonObject(text);
  } catch (err) {
    if (err && err.code === 'ocr_unreadable') {
      return emptyGraveFields(text);
    }
    throw err;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return emptyGraveFields(text);
  }

  return {
    name: clampText(parsed.name, 120),
    fatherNameOrPatronymic: clampText(parsed.fatherNameOrPatronymic || parsed.patronymic, 120),
    gregorianDateOfDeath: normalizeGregorianDate(parsed.gregorianDateOfDeath),
    hebrewDateText: clampText(parsed.hebrewDateText, 200),
    epitaphOrBio: clampText(parsed.epitaphOrBio || parsed.epitaph || parsed.bio, 2000),
    rawText: clampText(parsed.rawText, 4000),
    confidence: normalizeConfidence(parsed.confidence),
  };
}

function extractChatText(data) {
  const message = data && data.choices && data.choices[0] && data.choices[0].message;
  if (!message) {
    return '';
  }
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content.map((part) => (part && part.text) || '').join('\n');
  }
  return '';
}

function extractGeminiText(data) {
  const parts = data
    && data.candidates
    && data.candidates[0]
    && data.candidates[0].content
    && data.candidates[0].content.parts;
  if (!Array.isArray(parts)) {
    return '';
  }
  return parts.map((part) => (part && part.text) || '').join('\n');
}

async function prepareOcrImage(buffer) {
  let sharpLib = null;
  try {
    sharpLib = require('sharp');
  } catch (err) {
    sharpLib = null;
  }

  if (!sharpLib) {
    if (buffer.length > 4 * 1024 * 1024) {
      const error = new Error('Image is too large to read');
      error.code = 'image_too_large';
      throw error;
    }
    return { buffer, mimeType: 'image/jpeg' };
  }

  try {
    const output = await sharpLib(buffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { buffer: output, mimeType: 'image/jpeg' };
  } catch (err) {
    if (buffer.length > 0 && buffer.length <= 4 * 1024 * 1024 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      return { buffer, mimeType: 'image/jpeg' };
    }
    const error = new Error('Image could not be prepared');
    error.code = 'image_unreadable';
    throw error;
  }
}

function buildChatBody(model, dataUrl) {
  return {
    model,
    temperature: 0.1,
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: GRAVE_OCR_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  };
}

async function readErrorSnippet(response) {
  try {
    const text = await response.text();
    return String(text || '').slice(0, 240);
  } catch (err) {
    return '';
  }
}

async function callChatCompletions({ config, dataUrl, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL || 'http://localhost';
      headers['X-Title'] = process.env.OPENROUTER_APP_NAME || 'Synagogue Memorial';
    }

    const response = await fetchImpl(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildChatBody(config.model, dataUrl)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`OCR provider error (${response.status})`);
      error.code = 'ocr_failed';
      error.detail = await readErrorSnippet(response);
      throw error;
    }

    const payload = await response.json();
    return extractChatText(payload);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      const error = new Error('OCR provider timed out');
      error.code = 'ocr_failed';
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini({ config, prepared, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: GRAVE_OCR_PROMPT },
              {
                inline_data: {
                  mime_type: prepared.mimeType,
                  data: prepared.buffer.toString('base64'),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1200,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`OCR provider error (${response.status})`);
      error.code = 'ocr_failed';
      error.detail = await readErrorSnippet(response);
      throw error;
    }

    const payload = await response.json();
    return extractGeminiText(payload);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      const error = new Error('OCR provider timed out');
      error.code = 'ocr_failed';
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function scanGraveImage(image, options = {}) {
  const config = options.config || resolveGraveOcrConfig(options.env);
  if (!config.apiKey) {
    const error = new Error('Grave OCR is not configured');
    error.code = 'ocr_not_configured';
    throw error;
  }

  if (!image || !image.buffer || !image.buffer.length) {
    const error = new Error('Image is required');
    error.code = 'image_required';
    throw error;
  }

  const prepared = await prepareOcrImage(image.buffer);
  const fetchImpl = options.fetch || global.fetch;
  if (typeof fetchImpl !== 'function') {
    const error = new Error('Fetch is not available');
    error.code = 'ocr_failed';
    throw error;
  }

  const timeoutMs = options.timeoutMs || 45000;
  const raw = config.provider === 'gemini'
    ? await callGemini({ config, prepared, fetchImpl, timeoutMs })
    : await callChatCompletions({
      config,
      dataUrl: `data:${prepared.mimeType};base64,${prepared.buffer.toString('base64')}`,
      fetchImpl,
      timeoutMs,
    });

  return parseGraveOcrResponse(raw);
}

module.exports = {
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_DEEPSEEK_MODEL,
  DEFAULT_GEMINI_MODEL,
  GRAVE_OCR_PROMPT,
  resolveGraveOcrConfig,
  normalizeGregorianDate,
  parseGraveOcrResponse,
  buildChatBody,
  prepareOcrImage,
  scanGraveImage,
};
