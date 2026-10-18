import {
  parseMemorialQrPanelFromBody,
  memorialQrPanelForBoard,
} from '../../../lib/memorial-qr-panel';
import { normalizeBoardFont } from './board-fonts';
import { normalizeCandlePalette } from './candle-palette';
import { normalizeThemeBorders } from './theme-borders';

const PREVIEW_LANGS = ['ru', 'en', 'he'];

const MEMORIAL_QR_PREVIEW_KEYS = [
  'memorialQrTitleRu', 'memorialQrTitleEn', 'memorialQrTitleHe',
  'memorialQrTextRu', 'memorialQrTextEn', 'memorialQrTextHe',
  'donationQrTitleRu', 'donationQrTitleEn', 'donationQrTitleHe',
  'donationQrTextRu', 'donationQrTextEn', 'donationQrTextHe',
  'memorialQrTitleScale', 'memorialQrTextScale', 'memorialQrQrScale',
];

const FONT_SCALE_PREVIEW_KEYS = [
  'tileTitle', 'tileDate', 'clock', 'boardHeader', 'sidebar', 'prayers',
  'dailyStudy', 'hayomYom', 'prayerOverlay', 'torahNames', 'weather', 'shabbat', 'candle',
];

export function mergePreviewPatch(data, patch) {
  if (!data || !patch) {
    return data;
  }

  const next = {
    ...data,
    theme: { ...(data.theme || {}) },
    titles: { ...(data.titles || {}) },
  };

  if (patch.titleRu !== undefined) {
    next.titles.ru = patch.titleRu;
  }
  if (patch.titleEn !== undefined) {
    next.titles.en = patch.titleEn;
  }
  if (patch.titleHe !== undefined) {
    next.titles.he = patch.titleHe;
  }
  if (patch.primaryColor) {
    next.theme.primaryColor = patch.primaryColor;
  }
  if (patch.textColor) {
    next.theme.textColor = patch.textColor;
  }
  if (patch.accentColor) {
    next.theme.accentColor = patch.accentColor;
  }
  if (patch.tileColor) {
    next.theme.tileColor = patch.tileColor;
  }
  if (patch.tileOpacity !== undefined && patch.tileOpacity !== '') {
    next.theme.tileOpacity = Number(patch.tileOpacity);
  }
  if (patch.panelBorderColor) {
    next.theme.panelBorderColor = patch.panelBorderColor;
  }
  if (patch.panelBorderOpacity !== undefined && patch.panelBorderOpacity !== '') {
    next.theme.panelBorderOpacity = Number(patch.panelBorderOpacity);
  }
  if (patch.tileBorderColor) {
    next.theme.tileBorderColor = patch.tileBorderColor;
  }
  if (patch.tileBorderOpacity !== undefined && patch.tileBorderOpacity !== '') {
    next.theme.tileBorderOpacity = Number(patch.tileBorderOpacity);
  }
  if (patch.panelBorderRadius !== undefined && patch.panelBorderRadius !== '') {
    next.theme.panelBorderRadius = Number(patch.panelBorderRadius);
  }
  if (patch.panelBorderWidth !== undefined && patch.panelBorderWidth !== '') {
    next.theme.panelBorderWidth = Number(patch.panelBorderWidth);
  }
  if (patch.tileBorderRadius !== undefined && patch.tileBorderRadius !== '') {
    next.theme.tileBorderRadius = Number(patch.tileBorderRadius);
  }
  if (patch.tileBorderWidth !== undefined && patch.tileBorderWidth !== '') {
    next.theme.tileBorderWidth = Number(patch.tileBorderWidth);
  }
  if (patch.candlePalette) {
    next.theme.candlePalette = normalizeCandlePalette(patch.candlePalette);
  }
  if (patch.boardFont) {
    next.theme.boardFont = normalizeBoardFont(patch.boardFont);
  }
  if (patch.logoBorderRadius !== undefined && patch.logoBorderRadius !== '') {
    next.theme.logoBorderRadius = Number(patch.logoBorderRadius);
  }
  if (patch.logoBackground !== undefined) {
    const bg = String(patch.logoBackground || '').trim().toLowerCase();
    next.theme.logoBackground = bg === 'white' || bg === 'black' ? bg : '';
  }
  FONT_SCALE_PREVIEW_KEYS.forEach((key) => {
    const value = patch[`fontScale_${key}`];
    if (value !== undefined && value !== '') {
      next.theme.fontScales = { ...(next.theme.fontScales || {}) };
      next.theme.fontScales[key] = Number(value);
    }
  });
  if (patch.previewLang && PREVIEW_LANGS.includes(patch.previewLang)) {
    next.language = patch.previewLang;
  }

  const hasMemorialQr = MEMORIAL_QR_PREVIEW_KEYS.some(
    (key) => patch[key] !== undefined && patch[key] !== '',
  );
  if (hasMemorialQr) {
    next.memorialQrPanel = memorialQrPanelForBoard(
      parseMemorialQrPanelFromBody(patch, next.memorialQrPanel),
    );
  }

  Object.assign(next.theme, normalizeThemeBorders(next.theme));

  return next;
}

export function previewPatchFromSearchParams(params) {
  if (!params) {
    return null;
  }

  const hasPreview = params.get('preview') === '1'
    || params.has('primaryColor')
    || params.has('textColor')
    || params.has('accentColor')
    || params.has('tileColor')
    || params.has('tileOpacity')
    || params.has('panelBorderColor')
    || params.has('panelBorderOpacity')
    || params.has('tileBorderColor')
    || params.has('tileBorderOpacity')
    || params.has('panelBorderRadius')
    || params.has('panelBorderWidth')
    || params.has('tileBorderRadius')
    || params.has('tileBorderWidth')
    || params.has('candlePalette')
    || params.has('boardFont')
    || params.has('logoBorderRadius')
    || params.has('logoBackground')
    || params.has('fontScale_tileTitle')
    || params.has('titleRu')
    || params.has('titleEn')
    || params.has('titleHe')
    || params.has('previewLang')
    || params.has('memorialQrTitleScale');

  if (!hasPreview) {
    return null;
  }

  const patch = {};
  if (params.has('titleRu')) patch.titleRu = params.get('titleRu');
  if (params.has('titleEn')) patch.titleEn = params.get('titleEn');
  if (params.has('titleHe')) patch.titleHe = params.get('titleHe');
  if (params.has('primaryColor')) patch.primaryColor = params.get('primaryColor');
  if (params.has('textColor')) patch.textColor = params.get('textColor');
  if (params.has('accentColor')) patch.accentColor = params.get('accentColor');
  if (params.has('tileColor')) patch.tileColor = params.get('tileColor');
  if (params.has('tileOpacity')) patch.tileOpacity = params.get('tileOpacity');
  if (params.has('panelBorderColor')) patch.panelBorderColor = params.get('panelBorderColor');
  if (params.has('panelBorderOpacity')) patch.panelBorderOpacity = params.get('panelBorderOpacity');
  if (params.has('tileBorderColor')) patch.tileBorderColor = params.get('tileBorderColor');
  if (params.has('tileBorderOpacity')) patch.tileBorderOpacity = params.get('tileBorderOpacity');
  if (params.has('panelBorderRadius')) patch.panelBorderRadius = params.get('panelBorderRadius');
  if (params.has('panelBorderWidth')) patch.panelBorderWidth = params.get('panelBorderWidth');
  if (params.has('tileBorderRadius')) patch.tileBorderRadius = params.get('tileBorderRadius');
  if (params.has('tileBorderWidth')) patch.tileBorderWidth = params.get('tileBorderWidth');
  if (params.has('candlePalette')) patch.candlePalette = params.get('candlePalette');
  if (params.has('boardFont')) patch.boardFont = params.get('boardFont');
  if (params.has('logoBorderRadius')) patch.logoBorderRadius = params.get('logoBorderRadius');
  if (params.has('logoBackground')) patch.logoBackground = params.get('logoBackground');
  FONT_SCALE_PREVIEW_KEYS.forEach((key) => {
    if (params.has(`fontScale_${key}`)) {
      patch[`fontScale_${key}`] = params.get(`fontScale_${key}`);
    }
  });
  if (params.has('previewLang')) patch.previewLang = params.get('previewLang');
  [
    'memorialQrTitleScale', 'memorialQrTextScale', 'memorialQrQrScale',
  ].forEach((key) => {
    if (params.has(key)) {
      patch[key] = params.get(key);
    }
  });

  return patch;
}

export const BOARD_PREVIEW_MESSAGE = 'board-preview';
