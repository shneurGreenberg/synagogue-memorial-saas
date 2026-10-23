import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { hasJewishContentPanels, resolveBoardFeatures } from '../lib/board-features';
import { useBoardData } from '../context/BoardDataContext';
import { fetchJewishFeed } from '../lib/jewish-feed-client';
import { formatLearningLabelForDisplay } from '../lib/learning-label-display';
import { HayomYomScroller } from './HayomYomScroller';
import {
  buildDailyGateRows,
  dailyGateRowClassName,
  getEnabledDailyGateKeys,
} from '../../../lib/daily-gates-layout';

const REFRESH_MS = 15 * 60 * 1000;

function LearningTile({ label, item, sublabel, uiLang }) {
  if (!item || !item.label) {
    return null;
  }

  const valueLabel = formatLearningLabelForDisplay(item.label, uiLang);

  return (
    <div className="daily-gate-tile">
      <span className="daily-gate-heading">
        <span className="daily-gate-label">{label}</span>
        {sublabel && <span className="daily-gate-sublabel">{sublabel}</span>}
      </span>
      <span className="daily-gate-value">{valueLabel}</span>
    </div>
  );
}

function renderDailyGateTile(key, t, learning, uiLang) {
  switch (key) {
    case 'chumash':
      return (
        <LearningTile key={key} label={t('daily_chumash')} item={learning.chumash} uiLang={uiLang} />
      );
    case 'tanya':
      return (
        <LearningTile key={key} label={t('daily_tanya')} item={learning.tanya} uiLang={uiLang} />
      );
    case 'tehillim': {
      const sublabel = t('daily_tehillim_sublabel');
      return (
        <LearningTile
          key={key}
          label={t('daily_tehillim')}
          sublabel={sublabel || undefined}
          item={learning.tehillim}
          uiLang={uiLang}
        />
      );
    }
    case 'rambam1':
      return (
        <LearningTile
          key={key}
          label={t('daily_rambam')}
          sublabel={t('daily_rambam_one')}
          item={learning.rambam}
          uiLang={uiLang}
        />
      );
    case 'rambam3':
      return (
        <LearningTile
          key={key}
          label={t('daily_rambam')}
          sublabel={t('daily_rambam_three')}
          item={learning.rambam3}
          uiLang={uiLang}
        />
      );
    default:
      return null;
  }
}

function JewishContentPanelsBase({ t, uiLang, calendarDayKey }) {
  const { data: appData } = useBoardData();
  const boardFeatures = resolveBoardFeatures(appData.boardFeatures);
  const slug = appData.slug;
  const [feed, setFeed] = useState(null);

  useEffect(() => {
    if (!slug || !hasJewishContentPanels(boardFeatures)) {
      return undefined;
    }

    let cancelled = false;
    setFeed(null);

    const load = async () => {
      try {
        const next = await fetchJewishFeed(slug, uiLang, calendarDayKey || '');
        if (!cancelled && next) {
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
  }, [slug, uiLang, calendarDayKey, boardFeatures.dailyChumash, boardFeatures.dailyTehillim, boardFeatures.dailyTanya, boardFeatures.dailyRambam, boardFeatures.hayomYom]);

  if (!feed || !hasJewishContentPanels(boardFeatures)) {
    return null;
  }

  const learning = feed.dailyLearning || {};
  const showGates = boardFeatures.dailyChumash
    || boardFeatures.dailyTehillim
    || boardFeatures.dailyTanya
    || boardFeatures.dailyRambam;

  const hayomYom = learning.hayomYom || {};
  const dailyGateRows = buildDailyGateRows(getEnabledDailyGateKeys(boardFeatures, learning));

  return (
    <div className="jewish-sidebar-panels">
      {showGates && dailyGateRows.length > 0 && (
        <section className="daily-gates-panel" aria-label={t('daily_gates_title')}>
          <h2>{t('daily_gates_title')}</h2>
          <ul className="daily-gates-grid">
            {dailyGateRows.map((row) => (
              <li
                key={row.keys.join('-')}
                className={dailyGateRowClassName(row.single)}
              >
                {row.keys.map((key) => renderDailyGateTile(key, t, learning, uiLang))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {boardFeatures.hayomYom && (
        <section className="hayom-yom-panel" aria-label={t('hayom_yom_title')}>
          <h2>{t('hayom_yom_title')}</h2>
          {hayomYom.text ? (
            <HayomYomScroller text={hayomYom.text} />
          ) : (
            <p className="hayom-yom-note">{t('hayom_yom_loading')}</p>
          )}
        </section>
      )}
    </div>
  );
}

function JewishContentPanelsConnected(props) {
  const { calendarDayKey } = useBoardData();
  return <JewishContentPanelsBase {...props} calendarDayKey={calendarDayKey} />;
}

export const JewishContentPanels = withTranslation()(JewishContentPanelsConnected);
