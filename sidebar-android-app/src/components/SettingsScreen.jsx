import React, { useState } from 'react';
import { t } from '../lib/i18n';

export function SettingsScreen({
  settings, onSave, onBack, onOpenAdmin, lang,
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
            placeholder="https://example.com"
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

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={draft.useDeviceLocation}
            onChange={(event) => setDraft({ ...draft, useDeviceLocation: event.target.checked })}
          />
          <span>{t(lang, 'use_device_location')}</span>
        </label>

        {!draft.useDeviceLocation && (
          <>
            <label>
              <span>{t(lang, 'manual_lat')}</span>
              <input
                type="number"
                step="any"
                value={draft.manualLat}
                onChange={(event) => setDraft({ ...draft, manualLat: event.target.value })}
              />
            </label>
            <label>
              <span>{t(lang, 'manual_long')}</span>
              <input
                type="number"
                step="any"
                value={draft.manualLong}
                onChange={(event) => setDraft({ ...draft, manualLong: event.target.value })}
              />
            </label>
          </>
        )}

        <label>
          <span>{t(lang, 'admin_pin')}</span>
          <input
            type="password"
            value={draft.adminPin}
            onChange={(event) => setDraft({ ...draft, adminPin: event.target.value })}
          />
        </label>

        <p className="settings-hint">{t(lang, 'no_server_hint')}</p>

        <div className="settings-actions">
          <button type="submit" className="primary-btn">{t(lang, 'save')}</button>
          <button type="button" className="ghost-btn" onClick={onOpenAdmin}>{t(lang, 'admin_events')}</button>
        </div>
      </form>
    </div>
  );
}
