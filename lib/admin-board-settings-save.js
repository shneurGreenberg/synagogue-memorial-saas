const { BOARD_THEME_DEFAULTS } = require('./board-defaults');
const { normalizeBoardFont } = require('./board-fonts');
const {
  boardSubtitleToUpdate,
  parseBoardSubtitleFromBody,
  boardSubtitleThemeToUpdate,
  parseBoardSubtitleThemeFromBody,
} = require('./board-subtitle');
const { parseBoardFeaturesFromBody, FEATURE_FORM_KEYS } = require('./board-features');
const { parsePublicSubmissionFromBody, parseFormCheckbox } = require('./public-submission');
const {
  parseFontScalesFromBody,
  normalizeTileOpacity,
  normalizeLogoBorderRadius,
  normalizeLogoBackground,
} = require('./theme-typography');
const { normalizeThemeBorders } = require('./theme-borders');
const { normalizeCandlePalette } = require('./candle-palette');
const {
  memorialQrPanelToUpdate,
  parseMemorialQrPanelFromBody,
} = require('./memorial-qr-panel');
const { sanitizeHexColor } = require('./admin-theme');
const { normalizeBoardMode, parsePrayerTimesFromBody, hasPrayerTimesPayload } = require('./board-mode');

function bodyHas(body, key) {
  return !!(body && Object.prototype.hasOwnProperty.call(body, key));
}

function hasBoardFeaturesPayload(body) {
  if (bodyHas(body, 'boardFeaturesSection')) {
    return true;
  }
  return FEATURE_FORM_KEYS.some((key) => bodyHas(body, `feature_${key}`));
}

function hasSubtitlePayload(body) {
  return [
    'boardSubtitleEnabled',
    'boardSubtitleText',
    'boardSubtitleFont',
    'boardSubtitleColor',
    'boardSubtitleWeight',
  ].some((key) => bodyHas(body, key));
}

function hasMemorialQrTextPayload(body) {
  return [
    'memorialQrTitle',
    'memorialQrText',
    'donationQrTitle',
    'donationQrText',
    'memorialQrTitleScale',
    'memorialQrTextScale',
    'memorialQrQrScale',
  ].some((key) => bodyHas(body, key));
}

function readThemeBorderFields(body, existingTheme) {
  const theme = existingTheme || {};
  const current = normalizeThemeBorders(theme);
  const source = body || {};

  return normalizeThemeBorders({
    panelBorderColor: bodyHas(source, 'panelBorderColor') ? source.panelBorderColor : current.panelBorderColor,
    panelBorderOpacity: bodyHas(source, 'panelBorderOpacity') ? source.panelBorderOpacity : current.panelBorderOpacity,
    panelBorderRadius: bodyHas(source, 'panelBorderRadius') ? source.panelBorderRadius : current.panelBorderRadius,
    panelBorderWidth: bodyHas(source, 'panelBorderWidth') ? source.panelBorderWidth : current.panelBorderWidth,
    tileBorderColor: bodyHas(source, 'tileBorderColor') ? source.tileBorderColor : current.tileBorderColor,
    tileBorderOpacity: bodyHas(source, 'tileBorderOpacity') ? source.tileBorderOpacity : current.tileBorderOpacity,
    tileBorderRadius: bodyHas(source, 'tileBorderRadius') ? source.tileBorderRadius : current.tileBorderRadius,
    tileBorderWidth: bodyHas(source, 'tileBorderWidth') ? source.tileBorderWidth : current.tileBorderWidth,
  });
}

function buildBoardSettingsUpdate(body, synagogue, permissions) {
  const updateData = {};
  const theme = synagogue?.theme || {};

  if (permissions.settingsAppearance) {
    if (bodyHas(body, 'boardTitleText')) {
      updateData.boardTitleText = String(body.boardTitleText ?? '').trim();
    }

    if (hasSubtitlePayload(body)) {
      Object.assign(
        updateData,
        boardSubtitleToUpdate(parseBoardSubtitleFromBody(body, synagogue?.boardSubtitle)),
      );
      Object.assign(
        updateData,
        boardSubtitleThemeToUpdate(parseBoardSubtitleThemeFromBody(body, theme)),
      );
    }

    const themeColorKeys = [
      'primaryColor',
      'textColor',
      'accentColor',
      'tileColor',
      'tileOpacity',
      'candlePalette',
    ];
    const hasThemeColorPayload = themeColorKeys.some((key) => bodyHas(body, key))
      || [
        'panelBorderColor',
        'panelBorderOpacity',
        'panelBorderRadius',
        'panelBorderWidth',
        'tileBorderColor',
        'tileBorderOpacity',
        'tileBorderRadius',
        'tileBorderWidth',
      ].some((key) => bodyHas(body, key));

    if (hasThemeColorPayload) {
      if (bodyHas(body, 'primaryColor')) {
        updateData['theme.primaryColor'] = sanitizeHexColor(body.primaryColor, theme.primaryColor || BOARD_THEME_DEFAULTS.primaryColor);
      }
      if (bodyHas(body, 'textColor')) {
        updateData['theme.textColor'] = sanitizeHexColor(body.textColor, theme.textColor || BOARD_THEME_DEFAULTS.textColor);
      }
      if (bodyHas(body, 'accentColor')) {
        updateData['theme.accentColor'] = sanitizeHexColor(body.accentColor, theme.accentColor || BOARD_THEME_DEFAULTS.accentColor);
      }
      if (bodyHas(body, 'tileColor')) {
        updateData['theme.tileColor'] = sanitizeHexColor(body.tileColor, theme.tileColor || BOARD_THEME_DEFAULTS.tileColor);
      }
      if (bodyHas(body, 'tileOpacity')) {
        updateData['theme.tileOpacity'] = normalizeTileOpacity(body.tileOpacity);
      }
      if (bodyHas(body, 'candlePalette')) {
        updateData['theme.candlePalette'] = normalizeCandlePalette(body.candlePalette);
      }

      const themeBorders = readThemeBorderFields(body, theme);
      if (bodyHas(body, 'panelBorderColor')) {
        updateData['theme.panelBorderColor'] = themeBorders.panelBorderColor;
      }
      if (bodyHas(body, 'panelBorderOpacity')) {
        updateData['theme.panelBorderOpacity'] = themeBorders.panelBorderOpacity;
      }
      if (bodyHas(body, 'panelBorderRadius')) {
        updateData['theme.panelBorderRadius'] = themeBorders.panelBorderRadius;
      }
      if (bodyHas(body, 'panelBorderWidth')) {
        updateData['theme.panelBorderWidth'] = themeBorders.panelBorderWidth;
      }
      if (bodyHas(body, 'tileBorderColor')) {
        updateData['theme.tileBorderColor'] = themeBorders.tileBorderColor;
      }
      if (bodyHas(body, 'tileBorderOpacity')) {
        updateData['theme.tileBorderOpacity'] = themeBorders.tileBorderOpacity;
      }
      if (bodyHas(body, 'tileBorderRadius')) {
        updateData['theme.tileBorderRadius'] = themeBorders.tileBorderRadius;
      }
      if (bodyHas(body, 'tileBorderWidth')) {
        updateData['theme.tileBorderWidth'] = themeBorders.tileBorderWidth;
      }
    }

    if (bodyHas(body, 'boardFont')) {
      updateData['theme.boardFont'] = normalizeBoardFont(body.boardFont);
    }

    const fontScales = parseFontScalesFromBody(body, theme.fontScales);
    Object.entries(fontScales).forEach(([key, value]) => {
      const fieldName = `fontScale_${key}`;
      if (bodyHas(body, fieldName)) {
        updateData[`theme.fontScales.${key}`] = value;
      }
    });

    if (hasMemorialQrTextPayload(body)) {
      Object.assign(
        updateData,
        memorialQrPanelToUpdate(
          parseMemorialQrPanelFromBody(body, synagogue?.memorialQrPanel),
        ),
      );
    }

    if (bodyHas(body, 'publicSubmissionDonationUrl')) {
      const publicSubmission = parsePublicSubmissionFromBody(body);
      updateData['publicSubmission.donationUrl'] = publicSubmission.donationUrl || '';
    }
    if (bodyHas(body, 'publicSubmissionShowDonationQr')) {
      updateData['publicSubmission.showDonationQr'] = parseFormCheckbox(body, 'publicSubmissionShowDonationQr') === true;
    }
    if (bodyHas(body, 'publicSubmissionShowRegistrationQr')) {
      updateData['publicSubmission.showRegistrationQr'] = parseFormCheckbox(body, 'publicSubmissionShowRegistrationQr') === true;
    }
  }

  if ((permissions.settingsLanguages || permissions.settingsAppearance) && bodyHas(body, 'language')
    && ['ru', 'en', 'he'].includes(body.language)) {
    updateData.language = body.language;
  }

  if (permissions.settingsFeatures) {
    if (bodyHas(body, 'shabbatTimesEnabled')) {
      updateData.shabbatTimesEnabled = parseFormCheckbox(body, 'shabbatTimesEnabled') === true;
    }
    if (bodyHas(body, 'boardMode')) {
      updateData.boardMode = normalizeBoardMode(body.boardMode);
    }
    if (hasPrayerTimesPayload(body)) {
      updateData.prayerTimes = parsePrayerTimesFromBody(body);
    }
    if (bodyHas(body, 'boardHideSearchAndPager')) {
      updateData.boardHideSearchAndPager = parseFormCheckbox(body, 'boardHideSearchAndPager') === true;
    }
    if (hasBoardFeaturesPayload(body)) {
      const boardFeatures = parseBoardFeaturesFromBody(body, synagogue?.boardFeatures);
      Object.assign(updateData, Object.fromEntries(
        Object.entries(boardFeatures).map(([key, value]) => [`boardFeatures.${key}`, value]),
      ));
    }
  }

  if (permissions.settingsBranding) {
    if (bodyHas(body, 'logoCircle') || bodyHas(body, 'logoBorderRadius')) {
      const circleOn = parseFormCheckbox(body, 'logoCircle') === true
        || Number(body.logoBorderRadius) >= 50;
      updateData['theme.logoBorderRadius'] = circleOn ? 100 : 0;
    }
    if (bodyHas(body, 'logoBackground')) {
      updateData['theme.logoBackground'] = normalizeLogoBackground(body.logoBackground);
    }
  }

  return updateData;
}

module.exports = {
  buildBoardSettingsUpdate,
  bodyHas,
  hasBoardFeaturesPayload,
};
