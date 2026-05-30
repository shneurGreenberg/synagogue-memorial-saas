import i18n from './i18n';
import { getDisplayLanguage, setDisplayLanguage } from './person-names';

export function applyBoardLanguage(lang) {
  const safe = ['ru', 'he', 'en'].includes(lang) ? lang : 'ru';
  setDisplayLanguage(safe);
  i18n.changeLanguage(safe);
  return safe;
}

export function initBoardLanguage() {
  return applyBoardLanguage(getDisplayLanguage());
}

export { getDisplayLanguage, setDisplayLanguage };
