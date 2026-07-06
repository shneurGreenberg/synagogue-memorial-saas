import React, { useState } from 'react';
import { t } from '../lib/i18n';

export function SettingsScreen({
  settings, onSave, onBack, lang,
}) {
  const [draft, setDraft] = useState(settings);

  return (
    <div className="settings-screen">
      <header className="settings-header">
        <button type="button" className="icon-btn" onClick={onBack}>{t(lang, 'back')}</button>
        <h1>{t(lang, 'settings')}</h1>
      </header>

      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <label>
          <span>{t(lang, 'server_url')}</span>
          <input
            type="url"
            value={draft.serverUrl}
            onChange={(event) => setDraft({ ...draft, serverUrl: event.target.value })}
            placeholder="https://synagogue-kadish-shneur.amvera.io"
          />
        </label>

        <label>
          <span>{t(lang, 'synagogue_slug')}</span>
          <input
            type="text"
            value={draft.slug}
            onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
            placeholder="novosibirsk"
          />
        </label>
        <p className="settings-hint">{t(lang, 'server_url_hint')}</p>

        <label>
          <span>{t(lang, 'language')}</span>
          <select
            value={draft.language}
            onChange={(event) => setDraft({ ...draft, language: event.target.value })}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="he">עברית</option>
          </select>
        </label>

        <p className="settings-hint">{t(lang, 'no_server_hint')}</p>
        <p className="settings-hint">{t(lang, 'widget_help')}</p>

        <div className="settings-actions">
          <button type="submit" className="primary-btn">{t(lang, 'save')}</button>
        </div>
      </form>
    </div>
  );
}
