import React from 'react';
import { assetUrl } from '../lib/asset-url';
import {
  formatGregorianDate,
  formatHebrewDate,
} from '../lib/novosibirsk';
import { getNameDensityClass } from '../lib/text-density';

const CANDLE_CYCLE_MS = 4000;

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
    this.state = { showCandle: false };
    this.onActivate = this.onActivate.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    const { entry } = this.props;

    if (!entry) {
      return;
    }

    const phaseOffset = (entry.id * 317) % CANDLE_CYCLE_MS;
    this.candleTimer = window.setTimeout(() => {
      this.setState({ showCandle: true });
    }, phaseOffset);
  }

  componentWillUnmount() {
    if (this.candleTimer) {
      window.clearTimeout(this.candleTimer);
    }
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
        {this.state.showCandle && (
          <div className="candle-stack" aria-hidden="true">
            <img
              className="candle-flame"
              src={assetUrl('images/candle-flame.webp')}
              alt=""
              decoding="async"
            />
            <img
              className="candle-base"
              src={assetUrl('images/candle-base.webp')}
              alt=""
              decoding="async"
            />
          </div>
        )}
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
