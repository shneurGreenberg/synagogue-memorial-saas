import React from 'react';
import { PrayerReadingOverlay } from './PrayerReadingOverlay';

import { assetUrl } from '../lib/asset-url';

export class MemorialPrayersPanel extends React.Component {
  constructor(props) {
    super(props);
    this.viewportRef = React.createRef();
    this.trackRef = React.createRef();
    this.state = {
      shouldScroll: false,
      durationSec: 120,
      activePrayer: null,
    };
    this.openPrayer = this.openPrayer.bind(this);
    this.closePrayer = this.closePrayer.bind(this);
    this.onPrayerKeyDown = this.onPrayerKeyDown.bind(this);
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
    if (
      prevProps.kelMaleText !== this.props.kelMaleText
      || prevProps.izkorText !== this.props.izkorText
      || prevProps.big !== this.props.big
      || prevProps.showKelMale !== this.props.showKelMale
      || prevProps.showIzkor !== this.props.showIzkor
    ) {
      this.updateScrollBehavior();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateScrollBehavior);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
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

  measureContentHeight(track) {
    const inner = track.querySelector('.memorial-prayers-inner');
    if (inner) {
      return inner.getBoundingClientRect().height;
    }

    return track.scrollHeight;
  }

  updateScrollBehavior = () => {
    requestAnimationFrame(() => {
      const viewport = this.viewportRef.current;
      const track = this.trackRef.current;

      if (!viewport || !track) {
        return;
      }

      const contentHeight = this.measureContentHeight(track);
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

  renderPrayerBlock(id, heading, text, extraClass, audioSrc) {
    const prayer = { id, heading, text, extraClass, audioSrc };

    return (
      <section
        className={`memorial-prayer-block prayer-clickable ${extraClass || ''}`}
        aria-labelledby={id}
        role="button"
        tabIndex={0}
        onClick={() => this.openPrayer(prayer)}
        onKeyDown={(event) => this.onPrayerKeyDown(event, prayer)}
      >
        <h1 id={id}>{heading}</h1>
        <div className="prayer-text">{text}</div>
      </section>
    );
  }

  renderContent(suffix) {
    const {
      memorialPrayerLabel,
      kelMaleHeading,
      kelMaleText,
      izkorHeading,
      izkorText,
      showKelMale = true,
      showIzkor = true,
    } = this.props;

    return (
      <div className="memorial-prayers-inner" key={suffix}>
        {(showKelMale && showIzkor) && <h2>{memorialPrayerLabel}</h2>}
        {showKelMale && this.renderPrayerBlock(
          `kel-male-heading${suffix}`,
          kelMaleHeading,
          kelMaleText,
          'kel-male',
          assetUrl('audio/prayer-placeholder.mp3'),
        )}
        {showIzkor && this.renderPrayerBlock(
          `yizkor-heading${suffix}`,
          izkorHeading,
          izkorText,
          'yizkor',
          assetUrl('audio/prayer-placeholder.mp3'),
        )}
      </div>
    );
  }

  render() {
    const { big, showKelMale = true, showIzkor = true } = this.props;
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
          <div className="memorial-prayers-scroll" ref={this.viewportRef}>
            <div
              className={`memorial-prayers-track${this.state.shouldScroll ? ' is-scrolling' : ''}`}
              ref={this.trackRef}
              style={this.state.shouldScroll ? { animationDuration: `${this.state.durationSec}s` } : undefined}
            >
              {this.renderContent('')}
              {this.state.shouldScroll && this.renderContent('-dup')}
            </div>
          </div>
        </div>
      </>
    );
  }
}
