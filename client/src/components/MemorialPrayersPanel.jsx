import React from 'react';
import { PrayerReadingOverlay } from './PrayerReadingOverlay';

import { assetUrl } from '../lib/asset-url';

class PrayerTextScroller extends React.Component {
  constructor(props) {
    super(props);
    this.viewportRef = React.createRef();
    this.trackRef = React.createRef();
    this.state = {
      shouldScroll: false,
      durationSec: 120,
    };
  }

  componentDidMount() {
    this.updateScrollBehavior();
    window.addEventListener('resize', this.updateScrollBehavior);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateScrollBehavior();
      });

      if (this.viewportRef.current) {
        this.resizeObserver.observe(this.viewportRef.current);
      }
      if (this.trackRef.current) {
        this.resizeObserver.observe(this.trackRef.current);
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.text !== this.props.text || prevProps.big !== this.props.big) {
      this.updateScrollBehavior();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateScrollBehavior);
    this.resizeObserver?.disconnect();
  }

  updateScrollBehavior = () => {
    requestAnimationFrame(() => {
      const viewport = this.viewportRef.current;
      const track = this.trackRef.current;

      if (!viewport || !track) {
        return;
      }

      const contentHeight = this.state.shouldScroll
        ? track.scrollHeight / 2
        : track.scrollHeight;
      const needsScroll = contentHeight > viewport.clientHeight + 4;

      if (!needsScroll) {
        if (this.state.shouldScroll) {
          this.setState({ shouldScroll: false, durationSec: 120 });
        }
        return;
      }

      const rootStyles = getComputedStyle(document.documentElement);
      const prayerScale = parseFloat(rootStyles.getPropertyValue('--font-scale-prayers')) || 1;
      const pixelsPerSecond = 16 * prayerScale;
      const durationSec = Math.max(contentHeight / pixelsPerSecond, 90);

      if (!this.state.shouldScroll) {
        this.setState({ shouldScroll: true, durationSec });
        return;
      }

      if (Math.abs(this.state.durationSec - durationSec) > 2) {
        this.setState({ durationSec });
      }
    });
  };

  render() {
    const { text } = this.props;
    const { shouldScroll, durationSec } = this.state;

    return (
      <div className="memorial-prayer-text-scroll" ref={this.viewportRef}>
        <div
          className={`memorial-prayer-text-track${shouldScroll ? ' is-scrolling' : ''}`}
          ref={this.trackRef}
          style={shouldScroll ? { animationDuration: `${durationSec}s` } : undefined}
        >
          <div className="prayer-text">{text}</div>
          {shouldScroll && <div className="prayer-text">{text}</div>}
        </div>
      </div>
    );
  }
}

export class MemorialPrayersPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = { activePrayer: null };
    this.openPrayer = this.openPrayer.bind(this);
    this.closePrayer = this.closePrayer.bind(this);
    this.onPrayerKeyDown = this.onPrayerKeyDown.bind(this);
  }

  openPrayer(prayer) {
    this.setState({ activePrayer: prayer });
  }

  closePrayer() {
    this.setState({ activePrayer: null });
  }

  onPrayerKeyDown(event, prayer) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPrayer(prayer);
    }
  }

  renderPrayerBlock(id, heading, text, extraClass, audioSrc) {
    const prayer = { id, heading, text, extraClass, audioSrc };

    return (
      <section
        key={id}
        className={`memorial-prayer-block prayer-clickable ${extraClass || ''}`}
        aria-labelledby={id}
        role="button"
        tabIndex={0}
        onClick={() => this.openPrayer(prayer)}
        onKeyDown={(event) => this.onPrayerKeyDown(event, prayer)}
      >
        <h1 id={id}>{heading}</h1>
        <PrayerTextScroller text={text} big={this.props.big} />
      </section>
    );
  }

  render() {
    const {
      big,
      memorialPrayerLabel,
      kelMaleHeading,
      kelMaleText,
      izkorHeading,
      izkorText,
      showKelMale = true,
      showIzkor = true,
    } = this.props;
    const { activePrayer } = this.state;

    if (!showKelMale && !showIzkor) {
      return null;
    }

    return (
      <>
        {activePrayer && (
          <PrayerReadingOverlay
            heading={activePrayer.heading}
            text={activePrayer.text}
            extraClass={activePrayer.extraClass}
            audioSrc={activePrayer.audioSrc}
            onClose={this.closePrayer}
          />
        )}
        <div className={`memorial-prayers ${big ? 'memorial-prayers-big' : ''}`}>
          {(showKelMale && showIzkor) && (
            <h2 className="memorial-prayers-section-title">{memorialPrayerLabel}</h2>
          )}
          {showKelMale && this.renderPrayerBlock(
            'kel-male-heading',
            kelMaleHeading,
            kelMaleText,
            'kel-male',
            assetUrl('audio/prayer-placeholder.mp3'),
          )}
          {showIzkor && this.renderPrayerBlock(
            'yizkor-heading',
            izkorHeading,
            izkorText,
            'yizkor',
            assetUrl('audio/prayer-placeholder.mp3'),
          )}
        </div>
      </>
    );
  }
}
