import React, { useState } from 'react';
import { t } from '../lib/i18n';

export function AdminEventsScreen({
  events, onAdd, onDelete, onBack, lang,
}) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  return (
    <div className="settings-screen">
      <header className="settings-header">
        <button type="button" className="icon-btn" onClick={onBack}>{t(lang, 'back')}</button>
        <h1>{t(lang, 'admin_events')}</h1>
      </header>

      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          onAdd({ title: title.trim(), text: text.trim() });
          setTitle('');
          setText('');
        }}
      >
        <label>
          <span>{t(lang, 'event_title')}</span>
          <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          <span>{t(lang, 'event_text')}</span>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} />
        </label>
        <button type="submit" className="primary-btn">{t(lang, 'add_event')}</button>
      </form>

      <ul className="admin-events-list">
        {events.map((event) => (
          <li key={event.id} className="admin-event-card">
            <strong>{event.title}</strong>
            {event.text && <p>{event.text}</p>}
            <button type="button" className="danger-btn" onClick={() => onDelete(event.id)}>
              {t(lang, 'delete')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
