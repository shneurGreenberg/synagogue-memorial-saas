export function getDisplayLanguage() {
  if (typeof window === 'undefined') {
    return 'ru';
  }

  try {
    const stored = sessionStorage.getItem('boardLang');
    if (stored) {
      return stored;
    }
  } catch {
    /* ignore */
  }

  return (window.data && window.data.language) || 'ru';
}

export function setDisplayLanguage(lang) {
  try {
    sessionStorage.setItem('boardLang', lang);
  } catch {
    /* ignore */
  }
}
