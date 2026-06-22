import React from 'react';
import { createPortal } from 'react-dom';
import { withTranslation } from 'react-i18next';
import { assetUrl } from '../lib/asset-url';

class PrayerReadingOverlayBase extends React.Component {
  constructor(props) {
    super(props);
    this.candleRef = React.createRef();
    this.onOverlayClick = this.onOverlayClick.bind(this);
    this.stopPropagation = this.stopPropagation.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.restartCandleAnimation = this.restartCandleAnimation.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
    this.candleLoopTimer = window.setInterval(this.restartCandleAnimation, 3200);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
    if (this.candleLoopTimer) {
      window.clearInterval(this.candleLoopTimer);
    }
  }

  restartCandleAnimation() {
    const img = this.candleRef.current;
    if (!img) {
      return;
    }

    const src = img.getAttribute('src');
    if (!src) {
      return;
    }

    img.setAttribute('src', '');
    img.setAttribute('src', src);
  }

  onOverlayClick(event) {
    if (event.target !== event.currentTarget) {
      return;
    }

    this.props.onClose();
  }

  onKeyDown(event) {
    if (event.key === 'Escape') {
      this.props.onClose();
    }
  }

  stopPropagation(event) {
    event.stopPropagation();
  }

  render() {
    const { heading, text, extraClass, onClose, t } = this.props;

    return createPortal(
      <div
        className="prayer-reading-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={heading || t('memorial_prayer')}
        onClick={this.onOverlayClick}
      >
        <div className="prayer-reading-popup golden-panel" onClick={this.stopPropagation}>
          <button type="button" className="prayer-reading-close" onClick={onClose}>
            {t('close')}
          </button>
          <div className={`prayer-reading-layout ${extraClass || ''}`}>
            <div className="prayer-reading-candle-side" aria-hidden="true">
              <img
                ref={this.candleRef}
                className="prayer-reading-candle"
                src={assetUrl('images/candle.webp')}
                alt=""
                decoding="async"
              />
            </div>
            <div className="prayer-reading-content">
              {heading && <h1 className="prayer-reading-heading">{heading}</h1>}
              <p className="prayer-reading-text">
                {text}
              </p>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }
}

export const PrayerReadingOverlay = withTranslation()(PrayerReadingOverlayBase);
