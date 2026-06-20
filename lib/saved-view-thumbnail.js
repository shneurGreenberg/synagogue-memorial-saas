const path = require('path');
const { IMAGES_DIR } = require('./storage-paths');

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

async function generateSavedViewThumbnail(snapshot, filename) {
  const sharpLib = getSharp();
  const theme = snapshot.theme || {};
  const title = (snapshot.titles && (snapshot.titles.he || snapshot.titles.ru || snapshot.titles.en)) || '';
  const colors = [
    theme.primaryColor || '#cfaf1f',
    theme.textColor || '#f0f0f0',
    theme.accentColor || '#ffd54f',
    theme.tileColor || '#b89a22',
  ];

  const width = 384;
  const height = 216;
  const bandWidth = Math.floor(width / colors.length);
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1a1410"/>
      ${colors.map((color, index) => `
        <rect x="${index * bandWidth}" y="0" width="${bandWidth}" height="${height - 48}" fill="${escapeXml(color)}"/>
      `).join('')}
      <rect y="${height - 48}" width="100%" height="48" fill="rgba(0,0,0,0.72)"/>
      <text x="16" y="${height - 18}" fill="#ffffff" font-family="Arial, sans-serif" font-size="18">${escapeXml(title).slice(0, 42)}</text>
    </svg>
  `;

  const outputDir = path.join(IMAGES_DIR, 'saved-views');
  const outputPath = path.join(outputDir, filename);

  if (!sharpLib) {
    const fs = require('fs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, Buffer.from(svg));
    return `saved-views/${filename}`;
  }

  if (!require('fs').existsSync(outputDir)) {
    require('fs').mkdirSync(outputDir, { recursive: true });
  }

  await sharpLib(Buffer.from(svg))
    .jpeg({ quality: 82 })
    .toFile(outputPath);

  return `saved-views/${filename}`;
}

module.exports = {
  generateSavedViewThumbnail,
};
