const crypto = require('crypto');
const { BOARD_THEME_DEFAULTS, BOARD_BACKGROUND_DEFAULTS } = require('./board-defaults');
const { pickDesignFromSnapshot } = require('./saved-view-design');
const { normalizeSavedViews } = require('./saved-views');

const PRESET_VIEW_NAMES = ['בסיסי', 'אדום', 'עץ', 'אבן'];

function presetViewId(name) {
  return crypto.createHash('sha256').update(`saved-view-preset:${name}`).digest('hex').slice(0, 32);
}

function buildPresetTheme(name) {
  if (name === 'בסיסי') {
    return {
      ...BOARD_THEME_DEFAULTS,
      ...BOARD_BACKGROUND_DEFAULTS,
    };
  }

  if (name === 'אדום') {
    return {
      primaryColor: '#c62828',
      textColor: '#f5f5f5',
      accentColor: '#ef5350',
      tileColor: '#8e1c1c',
      tileOpacity: 100,
      backgroundImage: 'gold.png',
      tilesBackground: 'gold.png',
    };
  }

  if (name === 'עץ') {
    return {
      primaryColor: '#6d4c2a',
      textColor: '#f2ebe0',
      accentColor: '#a67c52',
      tileColor: '#5c3d1e',
      tileOpacity: 100,
      backgroundImage: 'wood2.png',
      tilesBackground: 'wood2.png',
    };
  }

  if (name === 'אבן') {
    return {
      primaryColor: '#8a8678',
      textColor: '#f0f0f0',
      accentColor: '#c5c0b0',
      tileColor: '#6b6560',
      tileOpacity: 100,
      backgroundImage: 'brickwall.jpg',
      tilesBackground: 'brickwall.jpg',
    };
  }

  return {};
}

function buildPresetSavedView(name) {
  const snapshot = pickDesignFromSnapshot({ theme: buildPresetTheme(name) });
  return {
    id: presetViewId(name),
    name,
    savedAt: new Date(0),
    screenshot: '',
    snapshot,
  };
}

function listPresetSavedViews() {
  return PRESET_VIEW_NAMES.map((name) => buildPresetSavedView(name));
}

function mergePresetSavedViews(savedViews) {
  const normalized = normalizeSavedViews(savedViews);
  const byName = new Map(normalized.map((view) => [view.name, view]));
  const merged = [...normalized];

  PRESET_VIEW_NAMES.forEach((name) => {
    if (!byName.has(name)) {
      merged.push(buildPresetSavedView(name));
    }
  });

  return merged;
}

function resolveDefaultActiveSavedViewId(savedViews) {
  const normalized = normalizeSavedViews(savedViews);
  const basic = normalized.find((view) => view.name === 'בסיסי');
  return basic ? basic.id : '';
}

module.exports = {
  PRESET_VIEW_NAMES,
  presetViewId,
  listPresetSavedViews,
  mergePresetSavedViews,
  resolveDefaultActiveSavedViewId,
};
