const BOARD_FONT_DEFAULT = 'georgia';

const BOARD_FONTS = [
  {
    id: 'georgia',
    labelKey: 'board_font_georgia',
    family: "Georgia, 'Times New Roman', serif",
    googleFonts: null,
  },
  {
    id: 'rubik',
    labelKey: 'board_font_rubik',
    family: "'Rubik', Georgia, serif",
    googleFonts: 'Rubik:ital,wght@0,400;0,500;0,600;0,700;1,400',
  },
  {
    id: 'heebo',
    labelKey: 'board_font_heebo',
    family: "'Heebo', Georgia, serif",
    googleFonts: 'Heebo:wght@400;500;600;700',
  },
  {
    id: 'arimo',
    labelKey: 'board_font_arimo',
    family: "'Arimo', Georgia, serif",
    googleFonts: 'Arimo:ital,wght@0,400;0,500;0,600;0,700;1,400',
  },
  {
    id: 'tinos',
    labelKey: 'board_font_tinos',
    family: "'Tinos', Georgia, serif",
    googleFonts: 'Tinos:ital,wght@0,400;0,700;1,400',
  },
  {
    id: 'alef',
    labelKey: 'board_font_alef',
    family: "'Alef', Georgia, serif",
    googleFonts: 'Alef:wght@400;700',
  },
  {
    id: 'noto-sans',
    labelKey: 'board_font_noto_sans',
    family: "'Noto Sans', 'Noto Sans Hebrew', Georgia, serif",
    googleFonts: 'Noto+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Hebrew:wght@400;500;600;700',
  },
  {
    id: 'noto-serif',
    labelKey: 'board_font_noto_serif',
    family: "'Noto Serif', 'Noto Serif Hebrew', Georgia, serif",
    googleFonts: 'Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Serif+Hebrew:wght@400;500;600;700',
  },
];

const FONT_BY_ID = Object.fromEntries(BOARD_FONTS.map((font) => [font.id, font]));

function normalizeBoardFont(value) {
  const id = String(value || '').trim().toLowerCase();
  if (FONT_BY_ID[id]) {
    return id;
  }
  return BOARD_FONT_DEFAULT;
}

function resolveBoardFontFamily(fontId) {
  const normalized = normalizeBoardFont(fontId);
  return FONT_BY_ID[normalized].family;
}

function buildGoogleFontsHref(fontId) {
  const normalized = normalizeBoardFont(fontId);
  const entry = FONT_BY_ID[normalized];
  if (!entry || !entry.googleFonts) {
    return null;
  }
  return `https://fonts.googleapis.com/css2?family=${entry.googleFonts}&display=swap`;
}

function collectGoogleFontsHref(fontId) {
  const href = buildGoogleFontsHref(fontId);
  return href ? [href] : [];
}

module.exports = {
  BOARD_FONT_DEFAULT,
  BOARD_FONTS,
  normalizeBoardFont,
  resolveBoardFontFamily,
  buildGoogleFontsHref,
  collectGoogleFontsHref,
};
