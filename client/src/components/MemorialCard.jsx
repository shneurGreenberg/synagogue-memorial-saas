import React from 'react';
import {
  formatGregorianDate,
  formatHebrewDate,
} from '../lib/novosibirsk';
import { getNameDensityClass } from '../lib/text-density';
import { CandleVideo } from './CandleVideo';

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
    this.cardRef = React.createRef();
    this.state = { showCandle: false };
    this.onActivate = this.onActivate.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.scheduleCandle = this.scheduleCandle.bind(this);
  }

  componentDidMount() {
    const { entry } = this.props;
    const card = this.cardRef.current;

    if (!entry) {
      return;
    }

    if (!card || typeof IntersectionObserver === 'undefined') {
      this.scheduleCandle(entry.id);
      return;
    }

    this.visibilityObserver = new IntersectionObserver((entries) => {
      const isVisible = Boolean(entries[0]?.isIntersecting);

      if (isVisible) {
        if (!this.candleTimer && !this.state.showCandle) {
          this.scheduleCandle(entry.id);
        }
        return;
      }

      if (this.candleTimer) {
        window.clearTimeout(this.candleTimer);
        this.candleTimer = null;
      }

      if (this.state.showCandle) {
        this.setState({ showCandle: false });
      }
    }, { threshold: 0.01, rootMargin: '20px' });

    this.visibilityObserver.observe(card);
  }

  componentWillUnmount() {
    this.visibilityObserver?.disconnect();

    if (this.candleTimer) {
      window.clearTimeout(this.candleTimer);
    }
  }

  scheduleCandle(entryId) {
    const phaseOffset = (entryId * 317) % CANDLE_CYCLE_MS;
    this.candleTimer = window.setTimeout(() => {
      this.candleTimer = null;
      this.setState({ showCandle: true });
    }, phaseOffset);
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
        ref={this.cardRef}
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
        <CandleVideo active={this.state.showCandle} />
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
