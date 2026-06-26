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

function hexToRgb(hex) {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) {
    return { r: 26, g: 20, b: 16 };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function generateSavedViewThumbnail(snapshot, filename) {
  const sharpLib = getSharp();
  const theme = snapshot.theme || {};
  const title = (snapshot.titles && (snapshot.titles.he || snapshot.titles.ru || snapshot.titles.en)) || '';
  const primary = theme.primaryColor || '#cfaf1f';
  const text = theme.textColor || '#f0f0f0';
  const accent = theme.accentColor || '#ffd54f';
  const tile = theme.tileColor || '#b89a22';
  const opacity = Number(theme.tileOpacity);
  const tileAlpha = Number.isFinite(opacity) ? Math.max(0.2, opacity / 100) : 1;

  const width = 480;
  const height = 270;
  const outerPad = 10;
  const panelX = outerPad;
  const panelY = outerPad;
  const panelW = width - outerPad * 2;
  const panelH = height - outerPad * 2;
  const leftW = Math.round(panelW * 0.2);
  const rightW = Math.round(panelW * 0.2);
  const centerW = panelW - leftW - rightW - 8;
  const leftX = panelX;
  const centerX = leftX + leftW + 4;
  const rightX = centerX + centerW + 4;
  const headerH = 28;
  const tileSize = 22;
  const tileGap = 4;

  let tileRects = '';
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const x = centerX + 8 + col * (tileSize + tileGap);
      const y = panelY + headerH + 10 + row * (tileSize + tileGap);
      tileRects += `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" rx="4" fill="${escapeXml(tile)}" opacity="${tileAlpha.toFixed(2)}"/>`;
    }
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#2a2118"/>
      <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="10" fill="${escapeXml(rgba(tile, tileAlpha))}" stroke="${escapeXml(primary)}" stroke-width="2"/>
      <rect x="${leftX}" y="${panelY + 6}" width="${leftW}" height="${panelH - 12}" rx="8" fill="${escapeXml(rgba(primary, 0.22))}"/>
      <rect x="${centerX}" y="${panelY + 6}" width="${centerW}" height="${panelH - 12}" rx="8" fill="${escapeXml(rgba(tile, Math.min(tileAlpha + 0.08, 1)))}"/>
      <rect x="${rightX}" y="${panelY + 6}" width="${rightW}" height="${panelH - 12}" rx="8" fill="${escapeXml(rgba(accent, 0.22))}"/>
      <rect x="${leftX + 8}" y="${panelY + 18}" width="${leftW - 16}" height="10" rx="3" fill="${escapeXml(accent)}" opacity="0.9"/>
      <rect x="${leftX + 8}" y="${panelY + 34}" width="${leftW - 16}" height="34" rx="4" fill="${escapeXml(rgba(text, 0.2))}"/>
      <rect x="${leftX + 8}" y="${panelY + 74}" width="${leftW - 16}" height="16" rx="3" fill="${escapeXml(rgba(primary, 0.55))}"/>
      <text x="${centerX + centerW / 2}" y="${panelY + headerH + 2}" fill="${escapeXml(primary)}" text-anchor="middle" font-family="Georgia, serif" font-size="14">${escapeXml(title).slice(0, 28)}</text>
      ${tileRects}
      <circle cx="${rightX + rightW / 2}" cy="${panelY + 42}" r="10" fill="${escapeXml(accent)}" opacity="0.85"/>
      <rect x="${rightX + 8}" y="${panelY + 62}" width="${rightW - 16}" height="8" rx="2" fill="${escapeXml(rgba(text, 0.35))}"/>
      <rect x="${rightX + 8}" y="${panelY + 76}" width="${rightW - 16}" height="8" rx="2" fill="${escapeXml(rgba(text, 0.28))}"/>
      <rect x="${rightX + 8}" y="${panelY + 90}" width="${rightW - 16}" height="8" rx="2" fill="${escapeXml(rgba(text, 0.28))}"/>
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
    .jpeg({ quality: 86 })
    .toFile(outputPath);

  return `saved-views/${filename}`;
}

module.exports = {
  generateSavedViewThumbnail,
};
