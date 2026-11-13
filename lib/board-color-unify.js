/**
 * 1.37.0 I74: «שמור על צבעים אחידים» (unified colors) + optional metallic-gold effect.
 *
 * When `theme.unifiedColors` is on, the board uses exactly two main colors:
 *   - primary color → the main title, people's names on the tiles and EVERY heading
 *     (barcode heading, אל מלא רחמים, היום יום, prayers / lessons / zmanim headings, sub-headings…);
 *   - text color    → every body text (dates, clock, prayers, lessons, zmanim, Hayom Yom,
 *     community messages, Shabbat times) AND the weather widget (text, icons, numbers).
 * When it is off nothing changes: the individual colors (accent, clock, Shabbat…) apply as before.
 *
 * Gold: `goldPrimary` / `goldText` / `goldClock` paint the texts that color covers with a metallic
 * gold gradient (background-clip:text). Browsers without background-clip:text get a solid gold.
 *
 * Shared by the server (save/normalize) and the board (ThemeStyles) — CommonJS on purpose.
 */

const COLOR_FLAG_KEYS = ['unifiedColors', 'goldPrimary', 'goldText', 'goldClock'];

function flagOn(value) {
  if (Array.isArray(value)) return value.some(flagOn);
  return value === true || value === 1 || value === '1' || value === 'on' || value === 'true';
}

function normalizeColorFlags(theme) {
  const source = theme && typeof theme === 'object' ? theme : {};
  const out = {};
  COLOR_FLAG_KEYS.forEach((key) => { out[key] = flagOn(source[key]); });
  return out;
}

/** Form body → `theme.*` $set entries (only for flags that were posted). */
function colorFlagsToUpdate(body) {
  const update = {};
  if (!body || typeof body !== 'object') return update;
  COLOR_FLAG_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      update[`theme.${key}`] = flagOn(body[key]);
    }
  });
  return update;
}

/** Live-preview patch → theme (values '1' / '0' / '' / booleans). */
function applyColorFlagsPatch(theme, patch) {
  const next = { ...(theme || {}) };
  if (!patch) return next;
  COLOR_FLAG_KEYS.forEach((key) => {
    if (patch[key] !== undefined && patch[key] !== null) {
      next[key] = flagOn(patch[key]);
    }
  });
  return next;
}

const P = 'html body .main-container';

// Every heading on the board (primary color when unified).
const HEADING_SELECTORS = [
  `${P} .board-header h1`,
  `${P} .cards-grid .card .inner h3`,
  `${P} .cards-grid-kadish .card .inner h3`,
  `${P} .jewish-sidebar-panels h2`,
  `${P} .hayom-yom-panel h2`,
  `${P} .daily-gates-panel h2`,
  `${P} .nearest-dates h2`,
  `${P} .memorial-prayers-section-title`,
  `${P} .memorial-prayers .memorial-prayer-block h1`,
  `${P} .memorial-prayers-inner > h2`,
  `${P} .memorial-submission-qr-header h2`,
  `${P} .synagogue-info-title`,
  `${P} .synagogue-info-group-title`,
  `${P} .synagogue-info-subheading`,
  `${P} .weather-panel h2`,
  `${P} .daily-gate-label`,
  `${P} .board-shabbat-block .shabbat-times .shabbat-parsha-heading`,
  // 1.37.1 I81: the parasha name and the Shabbat entry / exit (candle-lighting / havdalah) headings.
  `${P} .board-shabbat-block .shabbat-times .shabbat-parsha-name`,
  `${P} .board-shabbat-block .shabbat-times .shabbat-label`,
  // 1.37.1 I82: the headings of the items in the scrolling dates list.
  `${P} .sidebar-holiday-title`,
  `${P} .sidebar-chabad-title`,
  `${P} .community-event-title`,
  'html body .prayer-reading-heading',
];

// Primary-colored elements when NOT unified (title + names on the tiles).
const PRIMARY_BASE_SELECTORS = [
  `${P} .board-header h1`,
  `${P} .cards-grid .card .inner h3`,
  `${P} .cards-grid-kadish .card .inner h3`,
];

const CLOCK_SELECTORS = [
  `${P} .board-clock-block h1`,
  `${P} .board-clock-block h2`,
  `${P} .board-clock-block h3`,
  `${P} .board-clock-block time`,
];

// 1.37.1 I81: only the times themselves follow the text color when unified; the parasha name and
// the entry / exit labels are headings (primary color).
const SHABBAT_SELECTORS = [
  `${P} .board-shabbat-block .shabbat-times .shabbat-time`,
];

const WEATHER_TEXT_SELECTORS = [
  `${P} .weather-panel .weather-today-temp`,
  `${P} .weather-panel .weather-today-label`,
  `${P} .weather-panel .weather-sun-label`,
  `${P} .weather-panel .weather-sun-time`,
  `${P} .weather-panel .weather-cube-date`,
  `${P} .weather-panel .weather-cube-temps`,
  `${P} .weather-panel .weather-cube-temps *`,
  `${P} .weather-panel .weather-temp`,
  `${P} .weather-panel .weather-loading`,
  `${P} .weather-panel .weather-unavailable`,
];

const WEATHER_ICON_SELECTORS = [
  `${P} .weather-panel .weather-icon::before`,
];

// Body texts that already follow the text color today (gold-text target when NOT unified).
const TEXT_BASE_SELECTORS = [
  `${P} .cards-grid .card .inner time`,
  `${P} .cards-grid-kadish .card .inner time`,
  `${P} .nearest-dates .name`,
  `${P} .nearest-dates time`,
  `${P} .daily-cite`,
  `${P} .daily-gate-sublabel`,
  `${P} .daily-gate-value`,
  `${P} .hayom-yom-text`,
  `${P} .hayom-yom-note`,
  `${P} .memorial-prayers .prayer-text`,
  `${P} .synagogue-info-row dt`,
  `${P} .synagogue-info-row dd`,
  `${P} .synagogue-info-announcement`,
  `${P} .synagogue-info-announcement *`,
  `${P} .sidebar-holiday-link time`,
  `${P} .sidebar-chabad-link time`,
  `${P} .community-event-link time`,
  `${P} .sidebar-holiday-title`,
  `${P} .sidebar-chabad-title`,
  `${P} .community-event-title`,
  `${P} .community-event-text`,
  `${P} .community-event-text *`,
];

// 1.37.1 I82: with unified colors these list-item titles are headings (primary color), so they
// leave the text group; I80: the board subtitle is a text (text color), not a heading.
const UNIFIED_HEADING_FROM_TEXT = [
  `${P} .sidebar-holiday-title`,
  `${P} .sidebar-chabad-title`,
  `${P} .community-event-title`,
];
const SUBTITLE_SELECTORS = [`${P} .board-header-subtitle`];
const UNIFIED_TEXT_BASE_SELECTORS = TEXT_BASE_SELECTORS
  .filter((sel) => UNIFIED_HEADING_FROM_TEXT.indexOf(sel) === -1)
  .concat(SUBTITLE_SELECTORS);

// Everything the text color covers when unified.
const TEXT_SELECTORS = UNIFIED_TEXT_BASE_SELECTORS
  .concat(CLOCK_SELECTORS, SHABBAT_SELECTORS, WEATHER_TEXT_SELECTORS);

const GOLD_SOLID = '#d9b04a';
// Headings: classic vertical gold-bar gradient (one line).
const GOLD_GRADIENT_HEADING = 'linear-gradient(180deg, #fff4c2 0%, #f6dc85 20%, #e0b44a 42%, #a97a1e 54%, #d9ab3f 70%, #fbe7a1 88%, #c99a34 100%)';
// Body texts (may wrap): diagonal sheen that does not depend on line height.
const GOLD_GRADIENT_TEXT = 'linear-gradient(110deg, #c9972c 0%, #f7e08f 20%, #d6a93d 38%, #fff2b8 50%, #b8862a 66%, #f0cf6a 84%, #c9972c 100%)';

function colorRule(selectors, color) {
  if (!selectors.length) return '';
  return `${selectors.join(',\n')} {\n  color: ${color} !important;\n}\n`;
}

function goldRule(selectors, gradient, { shadow = false } = {}) {
  if (!selectors.length) return '';
  const list = selectors.join(',\n');
  return `${list} {\n  color: ${GOLD_SOLID} !important;\n}\n`
    + '@supports ((-webkit-background-clip: text) or (background-clip: text)) {\n'
    + `${list} {\n`
    + `  background-image: ${gradient} !important;\n`
    + '  background-size: 100% 100% !important;\n'
    + '  background-repeat: no-repeat !important;\n'
    + '  -webkit-background-clip: text !important;\n'
    + '  background-clip: text !important;\n'
    + '  -webkit-text-fill-color: transparent !important;\n'
    + '  text-shadow: none !important;\n'
    + (shadow ? '  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6));\n' : '')
    + '}\n}\n';
}

function goldIconRule(selectors) {
  if (!selectors.length) return '';
  // Monochrome icon glyphs take the gold color; colour-emoji glyphs get a warm gold tint.
  return `${selectors.join(',\n')} {\n  color: ${GOLD_SOLID} !important;\n`
    + '  -webkit-text-fill-color: currentColor;\n'
    + '  filter: grayscale(1) sepia(1) saturate(3.2) hue-rotate(-8deg) brightness(1.08);\n}\n';
}

/**
 * Extra board CSS for the unified-colors toggle and the gold effects ('' when nothing is on).
 * @param {object} opts { theme, primary, text, reduceEffects }
 */
function buildUnifiedColorCss({ theme, primary, text, reduceEffects = false } = {}) {
  const flags = normalizeColorFlags(theme);
  const parts = [];
  if (flags.unifiedColors) {
    parts.push('/* 1.37.0 I74 unified colors */');
    parts.push(`:root { --clock-color: ${text}; --shabbat-color: ${text}; --tile-title-color: ${primary}; --tile-date-color: ${text}; --board-subtitle-color: ${text}; }`);
    parts.push(colorRule(HEADING_SELECTORS, primary));
    parts.push(colorRule(TEXT_SELECTORS, text));
    parts.push(colorRule(WEATHER_ICON_SELECTORS, text));
    parts.push('html body .main-container .weather-panel .weather-icon::before { font-variant-emoji: text; }');
  }
  const headingShadow = { shadow: !reduceEffects };
  if (flags.goldPrimary) {
    parts.push('/* 1.37.0 I74 gold: primary */');
    parts.push(goldRule(flags.unifiedColors ? HEADING_SELECTORS : PRIMARY_BASE_SELECTORS, GOLD_GRADIENT_HEADING, headingShadow));
  }
  if (flags.goldText) {
    parts.push('/* 1.37.0 I74 gold: text */');
    if (flags.unifiedColors) {
      parts.push(goldRule(UNIFIED_TEXT_BASE_SELECTORS.concat(SHABBAT_SELECTORS, WEATHER_TEXT_SELECTORS), GOLD_GRADIENT_TEXT));
      parts.push(goldRule(CLOCK_SELECTORS, GOLD_GRADIENT_HEADING, headingShadow));
      parts.push(goldIconRule(WEATHER_ICON_SELECTORS));
    } else {
      parts.push(goldRule(TEXT_BASE_SELECTORS, GOLD_GRADIENT_TEXT));
    }
  }
  if (flags.goldClock && !flags.unifiedColors) {
    parts.push('/* 1.37.0 I74 gold: clock */');
    parts.push(goldRule(CLOCK_SELECTORS, GOLD_GRADIENT_HEADING, headingShadow));
  }
  return parts.filter(Boolean).join('\n');
}

module.exports = {
  COLOR_FLAG_KEYS,
  normalizeColorFlags,
  colorFlagsToUpdate,
  applyColorFlagsPatch,
  buildUnifiedColorCss,
  HEADING_SELECTORS,
  TEXT_SELECTORS,
  UNIFIED_TEXT_BASE_SELECTORS,
  WEATHER_ICON_SELECTORS,
  GOLD_GRADIENT_HEADING,
  GOLD_GRADIENT_TEXT,
};
