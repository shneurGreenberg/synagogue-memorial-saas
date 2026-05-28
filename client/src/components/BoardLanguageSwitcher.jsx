import React from 'react';
import { useBoardData } from '../context/BoardDataContext';

const LANGUAGES = [
  { code: 'ru', label: 'RU' },
  { code: 'he', label: 'עב' },
  { code: 'en', label: 'EN' },
];

export function BoardLanguageSwitcher() {
  const { uiLang, setUiLang } = useBoardData();
  const current = uiLang;

  const select = (code) => {
    if (code === current) {
      return;
    }

    setUiLang(code);
  };

  return (
    <div className="board-lang-switcher" role="group" aria-label="Language">
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
  );
}
