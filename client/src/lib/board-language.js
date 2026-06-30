import i18n, { ensureLanguageLoaded } from './i18n';
import { getDisplayLanguage, setDisplayLanguage } from './person-names';

export async function applyBoardLanguage(lang) {
  const safe = ['ru', 'he', 'en'].includes(lang) ? lang : 'ru';
  await ensureLanguageLoaded(safe);
  setDisplayLanguage(safe);
  i18n.changeLanguage(safe);
  document.documentElement.lang = safe;
  document.documentElement.dir = 'ltr';
  document.body.classList.remove('board-rtl');
  document.body.classList.toggle('board-lang-he', safe === 'he');
  return safe;
}

export function initBoardLanguage() {
  return applyBoardLanguage(getDisplayLanguage());
}

export { getDisplayLanguage, setDisplayLanguage };
