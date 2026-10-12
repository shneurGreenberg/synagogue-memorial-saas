(function (root) {
  var CANDLE_PALETTES = {
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

  var CANDLE_PALETTE_KEYS = Object.keys(CANDLE_PALETTES);

  function normalizeCandlePalette(value) {
    var key = String(value || 'classic').trim().toLowerCase();
    return CANDLE_PALETTE_KEYS.indexOf(key) >= 0 ? key : 'classic';
  }

  function resolveCandlePalette(value) {
    return CANDLE_PALETTES[normalizeCandlePalette(value)];
  }

  function applyCandlePaletteToElement(el, paletteKey) {
    if (!el) {
      return;
    }
    var p = resolveCandlePalette(paletteKey);
    el.style.setProperty('--candle-wax-top', p.waxTop);
    el.style.setProperty('--candle-wax-bottom', p.waxBottom);
    el.style.setProperty('--candle-wax-ring', p.waxRing);
    el.style.setProperty('--candle-wax-ring-edge', p.waxRingEdge);
    el.style.setProperty('--candle-flame-glow', p.flameGlow);
    el.style.setProperty('--candle-flame-core', p.flameCore);
    el.style.setProperty('--candle-flame-shadow', p.flameShadow);
    el.style.setProperty('--candle-blue-part', p.bluePart);
    el.style.setProperty('--candle-thread-hot', p.threadHot || '#ff7800');
    el.style.setProperty('--candle-base-outer', p.baseOuter || p.waxBottom);
    el.style.setProperty('--candle-base-inner', p.baseInner || p.waxBottom);
  }

  root.AdminCandlePalette = {
    normalizeCandlePalette: normalizeCandlePalette,
    applyCandlePaletteToElement: applyCandlePaletteToElement,
  };
}(typeof window !== 'undefined' ? window : {}));
