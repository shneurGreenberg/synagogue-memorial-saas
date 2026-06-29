const fs = require('fs');

let sharp;

function getSharp() {
  if (sharp !== undefined) {
    return sharp;
  }

  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    sharp = require('sharp');
  } catch (err) {
    sharp = null;
  }

  return sharp;
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxChars) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [''];
  }

  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
    }
    current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

function buildTileSvg({
  name,
  datesLine,
  initials,
  theme,
  photoDataUri,
}) {
  const primary = theme.primaryColor || '#cfaf1f';
  const textColor = theme.textColor || '#f0f0f0';
  const width = 560;
  const height = 720;
  const nameLines = wrapText(name, 22);
  const nameYStart = photoDataUri ? 430 : 360;
  const nameSvg = nameLines.map((line, index) => `
    <text x="50%" y="${nameYStart + (index * 42)}" text-anchor="middle" fill="${escapeXml(primary)}"
      font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700">${escapeXml(line)}</text>
  `).join('');

  const photoMarkup = photoDataUri
    ? `<image href="${photoDataUri}" x="180" y="72" width="200" height="200" clip-path="url(#photoClip)"/>`
    : `<circle cx="280" cy="172" r="100" fill="rgba(255,255,255,0.08)" stroke="${escapeXml(primary)}" stroke-width="4"/>
       <text x="280" y="190" text-anchor="middle" fill="${escapeXml(textColor)}" font-family="Arial, sans-serif" font-size="52" font-weight="700">${escapeXml(initials)}</text>`;

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="photoClip">
          <circle cx="280" cy="172" r="100"/>
        </clipPath>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.12)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.78)"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="28" fill="url(#bg)"/>
      <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="24" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>
      ${photoMarkup}
      ${nameSvg}
      <text x="50%" y="${nameYStart + (nameLines.length * 42) + 18}" text-anchor="middle" fill="${escapeXml(textColor)}"
        font-family="Georgia, 'Times New Roman', serif" font-size="22">${escapeXml(datesLine)}</text>
      <text x="470" y="650" font-size="42" aria-hidden="true">🕯</text>
    </svg>
  `);
}

async function renderYahrzeitTilePng({
  name,
  datesLine,
  photoFilename,
  photoCrop,
  theme,
}) {
  const sharpLib = getSharp();
  const initials = String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

  let photoDataUri = '';
  if (photoFilename) {
    const { getResizedPhoto } = require('./photo-resize');
    const photoPath = await getResizedPhoto(photoFilename, 400, photoCrop || null);

    if (photoPath && fs.existsSync(photoPath) && sharpLib) {
      const resized = await sharpLib(photoPath)
        .jpeg({ quality: 85 })
        .toBuffer();
      photoDataUri = `data:image/jpeg;base64,${resized.toString('base64')}`;
    }
  }

  const svg = buildTileSvg({
    name,
    datesLine,
    initials,
    theme: theme || {},
    photoDataUri,
  });

  if (!sharpLib) {
    return svg;
  }

  return sharpLib(svg).png().toBuffer();
}

module.exports = {
  renderYahrzeitTilePng,
};
