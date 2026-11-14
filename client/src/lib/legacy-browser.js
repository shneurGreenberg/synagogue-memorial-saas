export function isLowPowerBoardBrowser() {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';

  if (/SmartTV|SMART-TV|HbbTV|Web0S|WebOS|Tizen|NetCast|BRAVIA|Philips|Opera TV|TV Safari|GoogleTV|CrKey|AFTB|AFTM/i.test(ua)) {
    return true;
  }

  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) {
    return true;
  }

  return false;
}

export function isLegacyBoardBrowser() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof requestAnimationFrame !== 'function') {
    return true;
  }

  const probe = document.createElement('video');
  const h264Support = probe.canPlayType('video/mp4; codecs="avc1.42E01E"');
  if (h264Support !== 'probably' && h264Support !== 'maybe') {
    return true;
  }

  return false;
}

/** Very old engines only (no requestAnimationFrame): static candle, no CSS flame animation. */
export function shouldUseStaticCandleOnly() {
  if (typeof window === 'undefined') {
    return false;
  }
  return typeof requestAnimationFrame !== 'function';
}

/** TV / weak Chromium: avoid backdrop-filter stacks and fixed-bg compositor bugs. */
export function shouldReduceBoardCompositorLoad() {
  return isLowPowerBoardBrowser();
}

function candleModeOverride() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const value = String(params.get('candle') || '').toLowerCase();
    return ['static', 'lite', 'full', 'css'].includes(value) ? value : '';
  } catch (_) {
    return '';
  }
}

/**
 * 1.37.0 I76: the candle flames stopped moving on TVs / low-power screens because those were
 * forced to a fully static candle. They now get the "lite" candle — the flame still flickers
 * (cheap transform/opacity animation only), but without the blurred glow layer that was heavy
 * on the TV GPU. Fully static only for engines without requestAnimationFrame, or `?candle=static`.
 * 1.38.0 I85: 'full' / 'lite' flames are moved by one shared JS driver (lib/candle-flicker.js)
 * instead of a CSS animation per candle; `?candle=css` brings back the old CSS animation.
 */
export function resolveBoardCandleMode() {
  const override = typeof window !== 'undefined' ? candleModeOverride() : '';
  if (override) {
    return override;
  }
  if (shouldUseStaticCandleOnly()) {
    return 'static';
  }
  if (isLowPowerBoardBrowser() || isLegacyBoardBrowser()) {
    return 'lite';
  }
  return 'full';
}
