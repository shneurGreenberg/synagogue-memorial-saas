const https = require('https');

const HEBREW_MONTH_TO_HYMYM_FOLDER = {
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  1: 6,
  2: 7,
  3: 8,
  4: 9,
  5: 10,
  6: 11,
  7: 12,
  8: 13,
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'SynagogueMemorialBoard/1.0',
        Accept: 'text/html',
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

function hebrewMonthToFolder(month) {
  return HEBREW_MONTH_TO_HYMYM_FOLDER[month] || null;
}

function extractHebrewText(html) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const patterns = [
    /&gt;&gt;\s*<\/a>\s*([^<]{20,500})/i,
    />>\s*<\/a>\s*([^<]{20,500})/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const text = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 20 && !/Find:|SELECT|Node/i.test(text)) {
        return text;
      }
    }
  }

  return '';
}

async function getWaybackSnapshot(folder, day) {
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=chabadlibrary.org/books/admur/hymym/${folder}/${day}.htm&output=json&limit=2`;

  try {
    const data = await fetchJson(cdxUrl);
    if (!Array.isArray(data) || data.length < 2) {
      return null;
    }

    return data[1][1];
  } catch {
    return null;
  }
}

async function fetchHebrewAphorism(hebrewMonth, hebrewDay) {
  const folder = hebrewMonthToFolder(hebrewMonth);
  if (!folder) {
    return '';
  }

  const snapshot = await getWaybackSnapshot(folder, hebrewDay);
  if (!snapshot) {
    return '';
  }

  const url = `https://web.archive.org/web/${snapshot}/http://chabadlibrary.org/books/admur/hymym/${folder}/${hebrewDay}.htm`;

  try {
    const html = await fetchText(url);
    return extractHebrewText(html);
  } catch {
    return '';
  }
}

module.exports = {
  hebrewMonthToFolder,
  fetchHebrewAphorism,
  extractHebrewText,
};
