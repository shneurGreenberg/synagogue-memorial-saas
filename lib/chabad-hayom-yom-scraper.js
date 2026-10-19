const https = require('https');

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

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatChabadDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function extractEnglishAphorism(html) {
  const match = html.match(/Footnotes[\s\S]*?<\/a>\)\s*([^<]{8,400})/i);
  if (match) {
    return stripHtml(match[1]);
  }

  return '';
}

function extractHebrewAphorism(html) {
  const match = html.match(/אלע אידישע[\s\S]{20,800}?(?=About the book|HaYom Yom|Daily Study)/i);
  if (match) {
    return stripHtml(match[0]);
  }

  return '';
}

function extract5703Lessons(html) {
  const result = { chumash: '', tehillim: '', tanya: '' };
  const block = html.match(/Torah lessons:[\s\S]{0,1200}?Tanya:[\s\S]{0,400}?\./i);
  if (!block) {
    return result;
  }

  const text = stripHtml(block[0]);
  const chumash = text.match(/Chumash:\s*([^]+?)(?=Tehillim:|$)/i);
  const tehillim = text.match(/Tehillim:\s*([^]+?)(?=Tanya:|$)/i);
  const tanya = text.match(/Tanya:\s*([^]+?)(?=Compiled|$)/i);

  result.chumash = chumash ? chumash[1].trim() : '';
  result.tehillim = tehillim ? tehillim[1].trim() : '';
  result.tanya = tanya ? tanya[1].trim() : '';

  return result;
}

async function scrapeChabadHayomYom(date = new Date()) {
  const url = `https://www.chabad.org/dailystudy/hayomyom.asp?tdate=${encodeURIComponent(formatChabadDate(date))}`;
  const html = await fetchText(url);

  return {
    aphorismEn: extractEnglishAphorism(html),
    aphorismHe: extractHebrewAphorism(html),
    lessons5703: extract5703Lessons(html),
  };
}

module.exports = {
  scrapeChabadHayomYom,
  formatChabadDate,
};
