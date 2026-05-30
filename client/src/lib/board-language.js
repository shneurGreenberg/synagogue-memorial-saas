import i18n from './i18n';
import { getDisplayLanguage, setDisplayLanguage } from './person-names';

export function applyBoardLanguage(lang) {
  const safe = ['ru', 'he', 'en'].includes(lang) ? lang : 'ru';
  setDisplayLanguage(safe);
  i18n.changeLanguage(safe);
  const rtl = safe === 'he';
  document.documentElement.lang = safe;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.body.classList.toggle('board-rtl', rtl);
  return safe;
}

export function initBoardLanguage() {
  return applyBoardLanguage(getDisplayLanguage());
}

export { getDisplayLanguage, setDisplayLanguage };
