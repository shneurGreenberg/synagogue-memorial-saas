import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { isBoardPreviewMode } from '../lib/board-preview-mode';
import { hasJewishContentPanels, resolveBoardFeatures } from '../lib/board-features';
import { useBoardData } from '../context/BoardDataContext';
import { fetchJewishFeed } from '../lib/jewish-feed-client';
import { HayomYomScroller } from './HayomYomScroller';

const REFRESH_MS = 15 * 60 * 1000;

function LearningTile({ label, item, sublabel }) {
  if (!item || !item.label) {
    return null;
  }

  return (
    <div className="daily-gate-tile">
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
    if (!slug || !hasJewishContentPanels(boardFeatures) || isBoardPreviewMode()) {
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
  const lessons5703 = hayomYom.lessons5703 || {};
  const tanyaItem = lessons5703.tanya?.label ? lessons5703.tanya : learning.tanya;

  const chumashTile = boardFeatures.dailyChumash && (
    <LearningTile label={t('daily_chumash')} item={learning.chumash} />
  );
  const tanyaTile = boardFeatures.dailyTanya && (
    <LearningTile label={t('daily_tanya')} item={tanyaItem} />
  );

  return (
    <div className="jewish-sidebar-panels">
      {showGates && (
        <section className="daily-gates-panel" aria-label={t('daily_gates_title')}>
          <h2>{t('daily_gates_title')}</h2>
          <ul className="daily-gates-grid">
            {(chumashTile || tanyaTile) && (
              <li className={`daily-gates-row${chumashTile && tanyaTile ? '' : ' daily-gates-row--single'}`}>
                {chumashTile}
                {tanyaTile}
              </li>
            )}
            {boardFeatures.dailyTehillim && (
              <li className="daily-gates-row daily-gates-row--single">
                <LearningTile label={t('daily_tehillim')} item={learning.tehillim} />
              </li>
            )}
            {boardFeatures.dailyRambam && (learning.rambam || learning.rambam3) && (
              <li className="daily-gates-row">
                {learning.rambam && (
                  <LearningTile
                    label={t('daily_rambam')}
                    sublabel={t('daily_rambam_one')}
                    item={learning.rambam}
                  />
                )}
                {learning.rambam3 && (
                  <LearningTile
                    label={t('daily_rambam')}
                    sublabel={t('daily_rambam_three')}
                    item={learning.rambam3}
                  />
                )}
              </li>
            )}
          </ul>
        </section>
      )}

      {boardFeatures.hayomYom && (
        <section className="hayom-yom-panel" aria-label={t('hayom_yom_title')}>
          <h2>{t('hayom_yom_title')}</h2>
          {hayomYom.text || lessons5703.chumash?.label || lessons5703.tehillim?.label || lessons5703.tanya?.label ? (
            <HayomYomScroller
              text={hayomYom.text}
              lessons5703={lessons5703}
              lessonLabels={{
                chumash: t('daily_chumash'),
                tehillim: t('daily_tehillim'),
                tanya: t('daily_tanya'),
              }}
            />
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
