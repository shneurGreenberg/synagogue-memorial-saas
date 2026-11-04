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

/**
 * 1.34.0 I52: read the alarm-clock schedule from the admin form.
 *
 * The form posts:
 *   scheduleFrom / scheduleTo        'YYYY-MM-DD' or ''
 *   scheduleDay_<0-6>                '1' when that weekday has a window
 *   scheduleStart_<0-6> / scheduleEnd_<0-6>   'HH:MM'
 *
 * Bad values are ignored (never an error): a mistyped time just drops that window, and everything
 * empty means "always show when the slideshow is on".
 */
function parseSlideshowScheduleFromBody(body) {
  const source = body || {};
  const { normalizeSlideshowSchedule, normalizeDate, normalizeTime } = require('./slideshow-schedule');
  const days = [];

  for (let day = 0; day <= 6; day += 1) {
    const on = source[`scheduleDay_${day}`];
    // A day counts only when it is switched on; the times are what make the window.
    const enabled = on === '1' || on === 'on' || on === 'true' || on === true;
    if (!enabled) continue;
    const start = normalizeTime(source[`scheduleStart_${day}`]);
    const end = normalizeTime(source[`scheduleEnd_${day}`]);
    days.push({ day, start, end });
  }

  return normalizeSlideshowSchedule({
    from: normalizeDate(source.scheduleFrom),
    to: normalizeDate(source.scheduleTo),
    days,
  });
}

function hasSlideshowSchedulePayload(body) {
  const source = body || {};
  if (Object.prototype.hasOwnProperty.call(source, 'scheduleFrom')) return true;
  if (Object.prototype.hasOwnProperty.call(source, 'scheduleTo')) return true;
  for (let day = 0; day <= 6; day += 1) {
    if (Object.prototype.hasOwnProperty.call(source, `scheduleDay_${day}`)) return true;
    if (Object.prototype.hasOwnProperty.call(source, `scheduleStart_${day}`)) return true;
    if (Object.prototype.hasOwnProperty.call(source, `scheduleEnd_${day}`)) return true;
  }
  return false;
}

module.exports.parseSlideshowScheduleFromBody = parseSlideshowScheduleFromBody;
module.exports.hasSlideshowSchedulePayload = hasSlideshowSchedulePayload;
