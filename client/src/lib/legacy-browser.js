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

/** Old / TV displays: static candle image only (no video, canvas pool, or retries). */
export function shouldUseStaticCandleOnly() {
  return isLegacyBoardBrowser() || isLowPowerBoardBrowser();
}
