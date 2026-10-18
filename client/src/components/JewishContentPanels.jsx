import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { hasJewishContentPanels, resolveBoardFeatures } from '../lib/board-features';
import { useBoardData } from '../context/BoardDataContext';
import { fetchJewishFeed } from '../lib/jewish-feed-client';
import { HayomYomScroller } from './HayomYomScroller';
import {
  DAILY_GATE_RAMBAM3_SPAN_CLASS,
  chumashTanyaRowClassName,
  shouldShowRambam3Row,
  shouldShowTehillimRambamRow,
} from '../../../lib/daily-gates-layout';

const REFRESH_MS = 15 * 60 * 1000;

function LearningTile({ label, item, sublabel, className }) {
  if (!item || !item.label) {
    return null;
  }

  const tileClass = ['daily-gate-tile', className].filter(Boolean).join(' ');

  return (
    <div className={tileClass}>
      <span className="daily-gate-label">{label}</span>
      {sublabel && <span className="daily-gate-sublabel">{sublabel}</span>}
      <span className="daily-gate-value">{item.label}</span>
    </div>
  );
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
  const chumashTile = boardFeatures.dailyChumash && (
    <LearningTile label={t('daily_chumash')} item={learning.chumash} />
  );
  const tanyaTile = boardFeatures.dailyTanya && (
    <LearningTile label={t('daily_tanya')} item={learning.tanya} />
  );
  const tehillimTile = boardFeatures.dailyTehillim && (
    <LearningTile label={t('daily_tehillim')} item={learning.tehillim} />
  );
  const rambam1Tile = boardFeatures.dailyRambam && learning.rambam && (
    <LearningTile
      label={t('daily_rambam')}
      sublabel={t('daily_rambam_one')}
      item={learning.rambam}
    />
  );
  const showTehillimRambamRow = shouldShowTehillimRambamRow(boardFeatures, learning);
  const showRambam3Row = shouldShowRambam3Row(boardFeatures, learning);

  return (
    <div className="jewish-sidebar-panels">
      {showGates && (
        <section className="daily-gates-panel" aria-label={t('daily_gates_title')}>
          <h2>{t('daily_gates_title')}</h2>
          <ul className="daily-gates-grid">
            {(chumashTile || tanyaTile) && (
              <li className={chumashTanyaRowClassName(Boolean(chumashTile), Boolean(tanyaTile))}>
                {chumashTile}
                {tanyaTile}
              </li>
            )}
            {showTehillimRambamRow && (
              <li className="daily-gates-row">
                {tehillimTile}
                {rambam1Tile}
              </li>
            )}
            {showRambam3Row && (
              <li className="daily-gates-row">
                <LearningTile
                  label={t('daily_rambam')}
                  sublabel={t('daily_rambam_three')}
                  item={learning.rambam3}
                  className={DAILY_GATE_RAMBAM3_SPAN_CLASS}
                />
              </li>
            )}
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
