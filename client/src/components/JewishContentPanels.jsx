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

function LearningRow({ label, item }) {
  if (!item || !item.label) {
    return null;
  }

  const content = (
    <>
      <span className="daily-gate-label">{label}</span>
      <span className="daily-gate-value">{item.label}</span>
    </>
  );

  if (item.ref) {
    return (
      <li className="daily-gate-row">
        <a className="daily-gate-link" href={item.ref} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      </li>
    );
  }

  return <li className="daily-gate-row">{content}</li>;
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
  const hayomLinks = hayomYom.links || {};

  return (
    <div className="jewish-sidebar-panels">
      {showGates && (
        <section className="daily-gates-panel" aria-label={t('daily_gates_title')}>
          <h2>{t('daily_gates_title')}</h2>
          <ul className="daily-gates-list">
            {boardFeatures.dailyChumash && (
              <LearningRow label={t('daily_chumash')} item={learning.chumash} />
            )}
            {boardFeatures.dailyTehillim && (
              <LearningRow label={t('daily_tehillim')} item={learning.tehillim} />
            )}
            {boardFeatures.dailyTanya && (
              <LearningRow label={t('daily_tanya')} item={learning.tanya} />
            )}
            {boardFeatures.dailyRambam && (
              <LearningRow label={t('daily_rambam')} item={learning.rambam} />
            )}
          </ul>
        </section>
      )}

      {boardFeatures.hayomYom && (
        <section className="hayom-yom-panel" aria-label={t('hayom_yom_title')}>
          <h2>{t('hayom_yom_title')}</h2>
          <p className="hayom-yom-note">{t('hayom_yom_unavailable')}</p>
          <div className="hayom-yom-links">
            <a href={hayomLinks.he || 'https://he.chabad.org/dailystudy/hayomyom.htm'} target="_blank" rel="noopener noreferrer">
              {t('hayom_yom_hebrew')}
            </a>
            <a href={hayomLinks.en || 'https://www.chabad.org/dailystudy/hayomyom.asp'} target="_blank" rel="noopener noreferrer">
              {t('hayom_yom_english')}
            </a>
            <a href={hayomLinks.ruBook || 'https://jewishbook.com.ua/novie_knigi/iudaizm_i_mudrecu/shneerson/gayom-yom-segodnya-den.html'} target="_blank" rel="noopener noreferrer">
              {t('hayom_yom_russian_book')}
            </a>
          </div>
        </section>
      )}

      {boardFeatures.upcomingHolidays && holidays.length > 0 && (
        <section className="upcoming-holidays-panel" aria-label={t('upcoming_holidays_title')}>
          <h2>{t('upcoming_holidays_title')}</h2>
          <ul className="upcoming-holidays-list">
            {holidays.slice(0, 6).map((holiday) => (
              <li key={`${holiday.date}-${holiday.title}`} className="upcoming-holiday-row">
                {holiday.link ? (
                  <a className="upcoming-holiday-link" href={holiday.link} target="_blank" rel="noopener noreferrer">
                    <time dateTime={holiday.date}>{formatHolidayDate(holiday.date, uiLang)}</time>
                    <span className="upcoming-holiday-title">{holiday.title}</span>
                  </a>
                ) : (
                  <>
                    <time dateTime={holiday.date}>{formatHolidayDate(holiday.date, uiLang)}</time>
                    <span className="upcoming-holiday-title">{holiday.title}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export const JewishContentPanels = withTranslation()(JewishContentPanelsBase);
