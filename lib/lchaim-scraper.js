const http = require('http');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : http;
    const request = client.get(url, {
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
    });

    request.on('error', reject);
    request.setTimeout(15000, () => {
      request.destroy(new Error('Request timeout'));
    });
  });
}

function stripHtml(html) {
  const decoded = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  return decoded.replace(/\s+/g, ' ').trim();
}

function formatLchaimDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

function extractLessonsCell(html, yearTag) {
  const pattern = new RegExp(
    `Torah Lessons<br><small>\\(${yearTag}\\)</small></font></th><td[^>]*>(.*?)</td>`,
    'is',
  );
  const match = html.match(pattern);
  if (!match) {
    return '';
  }

  return stripHtml(match[1])
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .trim();
}

function parseLessonFields(lessonsText) {
  const result = {
    chumash: '',
    tehillim: '',
    tanya: '',
    rambam1: '',
    rambam3: '',
  };

  if (!lessonsText) {
    return result;
  }

  const chumash = lessonsText.match(/Chumash:\s*([^]+?)(?=Tehillim:|Tanya:|Rambam:|$)/i);
  const tehillim = lessonsText.match(/Tehillim:\s*([^]+?)(?=Tanya:|Rambam:|$)/i);
  const tanya = lessonsText.match(/Tanya:\s*([^]+?)(?=Rambam:|$)/i);
  const rambam1 = lessonsText.match(/1\s*chapter:\s*([^]+?)(?=Sefer|$)/i);
  const rambam3 = lessonsText.match(/3\s*chapters:\s*([^]+?)(?=1\s*chapter:|Sefer|$)/i);

  result.chumash = chumash ? chumash[1].replace(/\s*\/\s*Audio.*$/i, '').trim() : '';
  result.tehillim = tehillim ? tehillim[1].trim() : '';
  result.tanya = tanya ? tanya[1].replace(/\s*\/\s*Audio.*$/i, '').replace(/English text/gi, '').trim() : '';
  result.rambam1 = rambam1 ? stripHtml(rambam1[1]).replace(/\s*\/\s*Audio.*$/i, '').trim() : '';
  result.rambam3 = rambam3 ? stripHtml(rambam3[1]).replace(/\s*\/\s*Audio.*$/i, '').trim() : '';

  return result;
}

function extractAphorism(html) {
  const parts = html.split('hayom.gif');
  if (parts.length < 2) {
    return '';
  }

  const block = parts[1];
  const match = block.match(/<blockquote><div align=justify>(.*?)<\/div><\/blockquote>/is);
  if (!match) {
    return '';
  }

  const withoutTable = match[1].replace(/<table[\s\S]*?<\/table>/gi, '');
  return stripHtml(withoutTable);
}

async function fetchLchaimPage(date) {
  const dateParam = formatLchaimDate(date);
  const url = `https://www.lchaimweekly.org/cgi-bin/lessons.cgi?Center=y&d2=1&date=${dateParam}&width=35`;
  return fetchText(url);
}

async function fetchRambamTitle(date, chapters) {
  const dateParam = formatLchaimDate(date);
  const param = chapters === 3 ? 'r3=3' : 'r1=1';
  const url = `https://www.lchaimweekly.org/cgi-bin/lessons.cgi?date=${dateParam}&${param}&width=35&Center=y`;

  try {
    const html = await fetchText(url);
    const match = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    if (!match) {
      return '';
    }

    return stripHtml(match[1]);
  } catch {
    return '';
  }
}

async function scrapeDailyLearning(date = new Date()) {
  const html = await fetchLchaimPage(date);
  const lessons5786 = extractLessonsCell(html, '5786');
  const lessons5703 = extractLessonsCell(html, '5703');
  const parsed5786 = parseLessonFields(lessons5786);
  const parsed5703 = parseLessonFields(lessons5703);
  const aphorism = extractAphorism(html);

  const rambam1Title = await fetchRambamTitle(date, 1);
  const rambam3Title = await fetchRambamTitle(date, 3);

  return {
    lessons5786: parsed5786,
    lessons5703: parsed5703,
    aphorism,
    rambam1Title,
    rambam3Title,
  };
}

module.exports = {
  scrapeDailyLearning,
  fetchLchaimPage,
  extractAphorism,
  extractLessonsCell,
  parseLessonFields,
  formatLchaimDate,
};
