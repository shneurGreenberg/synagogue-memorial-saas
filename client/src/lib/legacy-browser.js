export function isLegacyBoardBrowser() {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';

  if (/SmartTV|SMART-TV|HbbTV|Web0S|WebOS|Tizen|NetCast|BRAVIA|Philips|Opera TV|TV Safari|GoogleTV|CrKey|AFTB|AFTM/i.test(ua)) {
    return true;
  }

  if (typeof IntersectionObserver === 'undefined') {
    return true;
  }

  if (typeof requestAnimationFrame !== 'function') {
    return true;
  }

  const probe = document.createElement('video');
  if (probe.canPlayType('video/mp4; codecs="avc1.42E01E"') === '') {
    return true;
  }

  return false;
}
