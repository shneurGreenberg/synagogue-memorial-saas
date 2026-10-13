const BOARD_FONT_DEFAULT = 'georgia';

const BOARD_FONTS = {
  georgia: {
    family: "Georgia, 'Times New Roman', serif",
    googleFonts: null,
  },
  rubik: {
    family: "'Rubik', Georgia, serif",
    googleFonts: 'Rubik:ital,wght@0,400;0,500;0,600;0,700;1,400',
  },
  heebo: {
    family: "'Heebo', Georgia, serif",
    googleFonts: 'Heebo:wght@400;500;600;700',
  },
  arimo: {
    family: "'Arimo', Georgia, serif",
    googleFonts: 'Arimo:ital,wght@0,400;0,500;0,600;0,700;1,400',
  },
  tinos: {
    family: "'Tinos', Georgia, serif",
    googleFonts: 'Tinos:ital,wght@0,400;0,700;1,400',
  },
  alef: {
    family: "'Alef', Georgia, serif",
    googleFonts: 'Alef:wght@400;700',
  },
  'noto-sans': {
    family: "'Noto Sans', 'Noto Sans Hebrew', Georgia, serif",
    googleFonts: 'Noto+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Hebrew:wght@400;500;600;700',
  },
  'noto-serif': {
    family: "'Noto Serif', 'Noto Serif Hebrew', Georgia, serif",
    googleFonts: 'Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Serif+Hebrew:wght@400;500;600;700',
  },
};

export function normalizeBoardFont(value) {
  const id = String(value || '').trim().toLowerCase();
  return BOARD_FONTS[id] ? id : BOARD_FONT_DEFAULT;
}

export function resolveBoardFontFamily(fontId) {
  const normalized = normalizeBoardFont(fontId);
  return BOARD_FONTS[normalized].family;
}

export function buildGoogleFontsHref(fontId) {
  const normalized = normalizeBoardFont(fontId);
  const entry = BOARD_FONTS[normalized];
  if (!entry || !entry.googleFonts) {
    return null;
  }
  return `https://fonts.googleapis.com/css2?family=${entry.googleFonts}&display=swap`;
}
