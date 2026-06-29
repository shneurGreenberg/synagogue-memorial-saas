const CANDLE_PALETTES = {
  classic: {
    waxTop: '#a7a2a2',
    waxBottom: '#212121',
    waxRing: '#d1c3ac',
    waxRingEdge: '#6f6f6f',
    flameGlow: '#ff6000',
    flameCore: 'white',
    flameShadow: 'orange',
    bluePart: 'rgba(0, 133, 255, 0.7)',
  },
  ivory: {
    waxTop: '#f0ebe0',
    waxBottom: '#c8bfb0',
    waxRing: '#faf6ef',
    waxRingEdge: '#d8cfc0',
    flameGlow: '#ff8c42',
    flameCore: '#fff8e7',
    flameShadow: '#ffb347',
    bluePart: 'rgba(100, 170, 255, 0.65)',
  },
  warm: {
    waxTop: '#e8d4b0',
    waxBottom: '#9a7b4f',
    waxRing: '#f5e6c8',
    waxRingEdge: '#b8956a',
    flameGlow: '#ff7b00',
    flameCore: '#fff4d6',
    flameShadow: '#e67e22',
    bluePart: 'rgba(80, 150, 255, 0.7)',
  },
  golden: {
    waxTop: '#e8c96a',
    waxBottom: '#8b6914',
    waxRing: '#f5dfa0',
    waxRingEdge: '#c9a227',
    flameGlow: '#ff9500',
    flameCore: '#fff8dc',
    flameShadow: '#daa520',
    bluePart: 'rgba(70, 140, 255, 0.7)',
  },
  pearl: {
    waxTop: '#f5f0e8',
    waxBottom: '#d4ccc0',
    waxRing: '#ffffff',
    waxRingEdge: '#e8e0d4',
    flameGlow: '#ffa040',
    flameCore: '#fffaf0',
    flameShadow: '#ffc878',
    bluePart: 'rgba(120, 180, 255, 0.6)',
  },
  amber: {
    waxTop: '#d4a574',
    waxBottom: '#6b4423',
    waxRing: '#e8c49a',
    waxRingEdge: '#8b5a2b',
    flameGlow: '#ff6600',
    flameCore: '#ffe4b5',
    flameShadow: '#cc5500',
    bluePart: 'rgba(60, 130, 240, 0.75)',
  },
};

const CANDLE_PALETTE_KEYS = Object.keys(CANDLE_PALETTES);

function normalizeCandlePalette(value) {
  const key = String(value || 'classic').trim().toLowerCase();
  return CANDLE_PALETTE_KEYS.includes(key) ? key : 'classic';
}

function resolveCandlePalette(value) {
  return CANDLE_PALETTES[normalizeCandlePalette(value)];
}

function buildCandlePaletteCssVars(palette) {
  const p = palette || CANDLE_PALETTES.classic;
  return `
    --candle-wax-top: ${p.waxTop};
    --candle-wax-bottom: ${p.waxBottom};
    --candle-wax-ring: ${p.waxRing};
    --candle-wax-ring-edge: ${p.waxRingEdge};
    --candle-flame-glow: ${p.flameGlow};
    --candle-flame-core: ${p.flameCore};
    --candle-flame-shadow: ${p.flameShadow};
    --candle-blue-part: ${p.bluePart};
    --candle-thread-hot: ${p.threadHot || '#ff7800'};
    --candle-base-outer: ${p.baseOuter || p.waxBottom};
    --candle-base-inner: ${p.baseInner || p.waxBottom};
  `;
}

module.exports = {
  CANDLE_PALETTES,
  CANDLE_PALETTE_KEYS,
  normalizeCandlePalette,
  resolveCandlePalette,
  buildCandlePaletteCssVars,
};
