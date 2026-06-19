import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import { hasJewishContentPanels, resolveBoardFeatures } from '../lib/board-features';

const REFRESH_MS = 60 * 60 * 1000;

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
  }, [slug, uiLang, boardFeatures.dailyChumash, boardFeatures.dailyTehillim, boardFeatures.dailyTanya, boardFeatures.dailyRambam, boardFeatures.hayomYom]);

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

  return (
    <div className="jewish-sidebar-panels">
      {showGates && (
        <section className="daily-gates-panel" aria-label={t('daily_gates_title')}>
          <h2>{t('daily_gates_title')}</h2>
          <ul className="daily-gates-grid">
            {(boardFeatures.dailyChumash || boardFeatures.dailyTanya) && (
              <li className="daily-gates-row">
                {boardFeatures.dailyChumash && (
                  <LearningTile label={t('daily_chumash')} item={learning.chumash} />
                )}
                {boardFeatures.dailyTanya && (
                  <LearningTile label={t('daily_tanya')} item={tanyaItem} />
                )}
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
          {hayomYom.text ? (
            <p className="hayom-yom-text">{hayomYom.text}</p>
          ) : (
            <p className="hayom-yom-note">{t('hayom_yom_loading')}</p>
          )}
        </section>
      )}
    </div>
  );
}

export const JewishContentPanels = withTranslation()(JewishContentPanelsBase);
