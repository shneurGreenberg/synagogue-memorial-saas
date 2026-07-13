import React from 'react';
import {
  formatGregorianDate,
  formatHebrewDate,
} from '../lib/novosibirsk';
import { getNameDensityClass } from '../lib/text-density';
import { CandleVideo } from './CandleVideo';
import { shouldUseStaticCandleOnly } from '../lib/legacy-browser';

const CANDLE_CYCLE_MS = 4000;
const STATIC_CANDLES = shouldUseStaticCandleOnly();

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
    const { entry, big } = this.props;
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
          ${entry.passedToday ? 'passed-today' : ''}
          ${entry.passedToday && !big ? 'card-outline' : ''}
        `}
        role="button"
        tabIndex={0}
        onClick={this.onActivate}
        onKeyDown={this.onKeyDown}
        aria-label={displayName}
      >
        <CandleVideo active={this.state.showCandle} animated={!STATIC_CANDLES} />
        <div className={`inner ${getNameDensityClass(displayName)}`}>
          <h3>{displayName}</h3>
          <div className="card-dates">
            <time dateTime={toDatetimeAttr(entry.gregorianDateOfDeath)}>
              {formatGregorianDate(entry.gregorianDateOfDeath)}
            </time>
            <time>{formatHebrewDate(entry.hebrewDateOfDeath)}</time>
          </div>
          {entry.title && big && <div className="title">{entry.title}</div>}
          <div className="placeholder" />
        </div>
      </article>
    );
  }
}

export function MemorialCard(props) {
  return <MemorialCardInner {...props} />;
}
