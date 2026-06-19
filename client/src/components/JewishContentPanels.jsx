import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import { hasJewishContentPanels, resolveBoardFeatures } from '../lib/board-features';

const REFRESH_MS = 60 * 60 * 1000;

function formatHolidayDate(dateStr, lang) {
  if (!dateStr) {
    return '';
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (lang === 'he') {
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  }

  if (lang === 'en') {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function LearningTile({ label, item, sublabel }) {
  if (!item || !item.label) {
    return null;
  }

  return (
    <li className="daily-gate-tile">
      <span className="daily-gate-label">{label}</span>
      {sublabel && <span className="daily-gate-sublabel">{sublabel}</span>}
      <span className="daily-gate-value">{item.label}</span>
    </li>
  );
}

function JewishContentPanelsBase({ t, uiLang }) {
  const appData = getBoardData();
  const boardFeatures = resolveBoardFeatures(appData.boardFeatures);
  const slug = appData.slug;
  const [feed, setFeed] = useState(null);

  useEffect(() => {
    if (!slug || !hasJewishContentPanels(boardFeatures)) {
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/s/${slug}/api/jewish-content?lang=${uiLang}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok || cancelled) {
          return;
        }

        const next = await response.json();
        if (!cancelled) {
          setFeed(next);
        }
      } catch {
        /* ignore transient network errors */
      }
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [slug, uiLang, boardFeatures.dailyChumash, boardFeatures.dailyTehillim, boardFeatures.dailyTanya, boardFeatures.dailyRambam, boardFeatures.hayomYom, boardFeatures.upcomingHolidays]);

  if (!feed || !hasJewishContentPanels(boardFeatures)) {
    return null;
  }

  const learning = feed.dailyLearning || {};
  const holidays = Array.isArray(feed.upcomingHolidays) ? feed.upcomingHolidays : [];
  const showGates = boardFeatures.dailyChumash
    || boardFeatures.dailyTehillim
    || boardFeatures.dailyTanya
    || boardFeatures.dailyRambam;

  const hayomYom = learning.hayomYom || {};
  const lessons5703 = hayomYom.lessons5703 || {};

  return (
    <div className="jewish-sidebar-panels">
      {showGates && (
        <section className="daily-gates-panel" aria-label={t('daily_gates_title')}>
          <h2>{t('daily_gates_title')}</h2>
          <ul className="daily-gates-grid">
            {boardFeatures.dailyChumash && (
              <LearningTile label={t('daily_chumash')} item={learning.chumash} />
            )}
            {boardFeatures.dailyTehillim && (
              <LearningTile label={t('daily_tehillim')} item={learning.tehillim} />
            )}
            {boardFeatures.dailyTanya && (
              <LearningTile label={t('daily_tanya')} item={learning.tanya} />
            )}
            {boardFeatures.dailyRambam && learning.rambam && (
              <LearningTile
                label={t('daily_rambam')}
                sublabel={t('daily_rambam_one')}
                item={learning.rambam}
              />
            )}
            {boardFeatures.dailyRambam && learning.rambam3 && (
              <LearningTile
                label={t('daily_rambam')}
                sublabel={t('daily_rambam_three')}
                item={learning.rambam3}
              />
            )}
          </ul>
        </section>
      )}

      {boardFeatures.hayomYom && (
        <section className="hayom-yom-panel" aria-label={t('hayom_yom_title')}>
          <h2>{t('hayom_yom_title')}</h2>
          {hayomYom.text ? (
            <p className="hayom-yom-text">{hayomYom.text}</p>
          ) : (
            <p className="hayom-yom-note">{t('hayom_yom_loading')}</p>
          )}
          {(lessons5703.chumash || lessons5703.tehillim || lessons5703.tanya) && (
            <ul className="hayom-yom-lessons-grid">
              {lessons5703.chumash?.label && (
                <li className="hayom-yom-lesson-tile">
                  <span className="daily-gate-label">{t('daily_chumash')}</span>
                  <span className="daily-gate-value">{lessons5703.chumash.label}</span>
                </li>
              )}
              {lessons5703.tehillim?.label && (
                <li className="hayom-yom-lesson-tile">
                  <span className="daily-gate-label">{t('daily_tehillim')}</span>
                  <span className="daily-gate-value">{lessons5703.tehillim.label}</span>
                </li>
              )}
              {lessons5703.tanya?.label && (
                <li className="hayom-yom-lesson-tile">
                  <span className="daily-gate-label">{t('daily_tanya')}</span>
                  <span className="daily-gate-value">{lessons5703.tanya.label}</span>
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {boardFeatures.upcomingHolidays && holidays.length > 0 && (
        <section className="upcoming-holidays-panel" aria-label={t('upcoming_holidays_title')}>
          <h2>{t('upcoming_holidays_title')}</h2>
          <ul className="upcoming-holidays-grid">
            {holidays.slice(0, 6).map((holiday) => (
              <li key={`${holiday.date}-${holiday.title}`} className="upcoming-holiday-tile">
                <time dateTime={holiday.date}>{formatHolidayDate(holiday.date, uiLang)}</time>
                <span className="upcoming-holiday-title">{holiday.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export const JewishContentPanels = withTranslation()(JewishContentPanelsBase);
