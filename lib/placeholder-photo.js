const https = require('https');
const http = require('http');

function downloadUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }

    const lib = url.startsWith('https') ? https : http;

    lib.get(url, {
      headers: {
        'User-Agent': 'KadishMemorial/1.0 (photo-seed)',
        Accept: 'image/*',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        downloadUrl(next, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchGeneratedFace() {
  return downloadUrl('https://thispersondoesnotexist.com/');
}

async function fetchRandomUserPortrait(personId) {
  const gender = personId % 2 === 0 ? 'men' : 'women';
  const index = personId % 99;
  return downloadUrl(`https://randomuser.me/api/portraits/${gender}/${index}.jpg`);
}

async function fetchDiceBearPortrait(personId) {
  return downloadUrl(`https://api.dicebear.com/7.x/personas/png?seed=${personId}&size=256`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {number} personId
 * @param {'generated'|'random'|'dicebear'} source
 */
async function fetchPlaceholderPhoto(personId, source = 'random') {
  if (source === 'generated') {
    await sleep(1200);
    return fetchGeneratedFace();
  }

  if (source === 'dicebear') {
    return fetchDiceBearPortrait(personId);
  }

  try {
    return await fetchRandomUserPortrait(personId);
  } catch (err) {
    return fetchDiceBearPortrait(personId);
  }
}

module.exports = {
  downloadUrl,
  fetchGeneratedFace,
  fetchRandomUserPortrait,
  fetchDiceBearPortrait,
  fetchPlaceholderPhoto,
  sleep,
};
