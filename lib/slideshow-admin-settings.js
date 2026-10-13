/**
 * Slideshow settings helpers for admin events tab.
 */

function parseSlideshowSettingsBody(body) {
  const raw = body || {};
  const modeRaw = String(raw.slideshowMode || '').trim();
  if (modeRaw === 'off' || modeRaw === 'rotate' || modeRaw === 'showNow') {
    return {
      isEnabled: modeRaw !== 'off',
      mode: modeRaw === 'showNow' ? 'showNow' : 'rotate',
      modeValue: modeRaw,
    };
  }

  const { enabled, displayMode } = raw;
  const isEnabled = enabled === 'on' || enabled === 'true' || enabled === true || enabled === '1';
  const mode = displayMode === 'showNow' ? 'showNow' : 'rotate';
  return {
    isEnabled,
    mode,
    modeValue: isEnabled ? mode : 'off',
  };
}

function shouldShowSlideshowRotateFields(modeValue) {
  return modeValue === 'rotate';
}

function slideshowRotateFieldsInitiallyHidden(slideshow) {
  if (!slideshow || !slideshow.enabled) {
    return true;
  }
  return slideshow.isShowNowMode === true;
}

module.exports = {
  parseSlideshowSettingsBody,
  shouldShowSlideshowRotateFields,
  slideshowRotateFieldsInitiallyHidden,
};
