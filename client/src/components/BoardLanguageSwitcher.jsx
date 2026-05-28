import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBoardData } from '../context/BoardDataContext';

const LANGUAGES = [
  { code: 'ru', label: 'RU' },
  { code: 'he', label: 'עב' },
  { code: 'en', label: 'EN' },
];

export function BoardLanguageSwitcher() {
  const { t } = useTranslation();
  const { uiLang, setUiLang } = useBoardData();
  const current = uiLang;

  const select = (code) => {
    if (code === current) {
      return;
    }

    setUiLang(code);
  };

  return (
    <div className="board-lang-switcher golden-panel" role="group" aria-label={t('language')}>
      <span className="board-lang-label">{t('language')}</span>
      <div className="board-lang-options">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={`board-lang-btn${current === lang.code ? ' is-active' : ''}`}
            onClick={() => select(lang.code)}
            aria-pressed={current === lang.code}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
