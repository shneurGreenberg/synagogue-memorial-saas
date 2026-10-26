import React from 'react';
import { withTranslation } from 'react-i18next';
import {
  formatGregorianDate,
  formatHebrewDate,
} from '../lib/novosibirsk';
import { getNameDensityClass } from '../lib/text-density';
import { CandleVideo } from './CandleVideo';
import { resolveBoardCandleMode } from '../lib/legacy-browser';
import { entryShowsDeathDate } from '../../../lib/death-date';

const CANDLE_CYCLE_MS = 4000;
const CANDLE_MODE = resolveBoardCandleMode();

function toDatetimeAttr(gregorianDateOfDeath) {
  if (!gregorianDateOfDeath || !gregorianDateOfDeath.year) {
    return undefined;
  }

  const month = String(gregorianDateOfDeath.month).padStart(2, '0');
  const day = String(gregorianDateOfDeath.date).padStart(2, '0');

  return `${gregorianDateOfDeath.year}-${month}-${day}`;
}

class MemorialCardInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showCandle: true };
    this.onActivate = this.onActivate.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  onActivate() {
    const { entry, onOpen } = this.props;

    if (!entry || !onOpen) {
      return;
    }

    onOpen(entry.id);
  }

  onKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onActivate();
    }
  }

  render() {
    const { entry, big, emphasizeYahrzeitToday, t } = this.props;
    const displayName = entry?.name || '';

    if (!entry) {
      return <div className="card card-hidden" aria-hidden="true" />;
    }

    return (
      <article
        className={`
          card
          golden-panel
          ${big ? 'card-big' : ''}
          ${emphasizeYahrzeitToday ? 'card-yahrzeit-today' : ''}
          ${entry.isPermanent ? 'card-permanent' : ''}
        `}
        role="button"
        tabIndex={0}
        onClick={this.onActivate}
        onKeyDown={this.onKeyDown}
        aria-label={displayName}
      >
        {entry.isPermanent && (
          <span className="card-permanent-mark" aria-label={t ? t('permanent_mark') : undefined}>
            <span className="card-permanent-mark-star" aria-hidden="true">✦</span>
            {t ? <span className="card-permanent-mark-text">{t('permanent_mark')}</span> : null}
          </span>
        )}
        <CandleVideo active={this.state.showCandle} mode={CANDLE_MODE} />
        <div className={`inner ${getNameDensityClass(displayName)}`}>
          <h3>{displayName}</h3>
          {entryShowsDeathDate(entry) && (
            <div className="card-dates">
              <time dateTime={toDatetimeAttr(entry.gregorianDateOfDeath)}>
                {formatGregorianDate(entry.gregorianDateOfDeath)}
              </time>
              <time>{formatHebrewDate(entry.hebrewDateOfDeath)}</time>
            </div>
          )}
          {entry.title && big && <div className="title">{entry.title}</div>}
          <div className="placeholder" />
        </div>
      </article>
    );
  }
}

const MemorialCardTranslated = withTranslation()(MemorialCardInner);

export function MemorialCard(props) {
  return <MemorialCardTranslated {...props} />;
}
