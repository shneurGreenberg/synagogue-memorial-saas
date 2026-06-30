import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './i18n-resources/ru.js';

const LANGUAGE_LOADERS = {
  en: () => import('./i18n-resources/en.js'),
  ru: () => Promise.resolve({ default: ru }),
  he: () => import('./i18n-resources/he.js'),
};

const loadedLanguages = new Set(['ru']);

export function getInitialLng() {
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

export async function ensureLanguageLoaded(lang) {
  const safe = ['ru', 'he', 'en'].includes(lang) ? lang : 'ru';
  if (loadedLanguages.has(safe)) {
    return safe;
  }

  const loader = LANGUAGE_LOADERS[safe];
  if (!loader) {
    return safe;
  }

  const module = await loader();
  i18n.addResourceBundle(safe, 'translation', module.default, true, true);
  loadedLanguages.add(safe);
  return safe;
}

export async function initBoardI18n() {
  const initialLng = getInitialLng();
  await ensureLanguageLoaded(initialLng);

  if (!i18n.isInitialized) {
    i18n
      .use(initReactI18next)
      .init({
        resources: {
          ru: { translation: ru },
        },
        lng: initialLng,
        fallbackLng: 'ru',
        interpolation: {
          escapeValue: false,
        },
        partialBundledLanguages: true,
      });

    i18n.on('languageChanged', (lang) => {
      ensureLanguageLoaded(lang).catch(() => {
        /* ignore language load errors */
      });
    });
  } else if (initialLng !== i18n.language) {
    await i18n.changeLanguage(initialLng);
  }

  return i18n;
}

export default i18n;
