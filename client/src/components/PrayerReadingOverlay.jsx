import React from 'react';
import { createPortal } from 'react-dom';
import { withTranslation } from 'react-i18next';
import { assetUrl } from '../lib/asset-url';

function estimateTextHeight(text, fontSize, maxWidth) {
  const lineHeight = 1.48;
  const charWidth = fontSize * 0.52;
  const charsPerLine = Math.max(1, Math.floor(maxWidth / charWidth));
  const paragraphs = String(text || '').split('\n');
  let lines = 0;

  paragraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines += 1;
      return;
    }

    lines += Math.max(1, Math.ceil(trimmed.length / charsPerLine));
  });

  return lines * fontSize * lineHeight;
}

function computePrayerFontSize(text, heading) {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const horizontalPadding = Math.max(24, vw * 0.04);
  const verticalPadding = Math.max(72, vh * 0.12);
  const candleColumn = Math.min(Math.max(vw * 0.18, 120), 240);
  const gap = 20;
  const contentWidth = Math.max(220, vw - horizontalPadding * 2 - candleColumn - gap);
  const availableHeight = Math.max(180, vh - verticalPadding);
  const headingSpace = heading ? 56 : 0;
  const textHeightBudget = availableHeight - headingSpace;
  let low = 10;
  let high = 72;
  let best = low;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const height = estimateTextHeight(text, mid, contentWidth);

    if (height <= textHeightBudget) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(12, best);
}

class PrayerReadingOverlayBase extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fontSize: 24 };
    this.candleRef = React.createRef();
    this.onOverlayClick = this.onOverlayClick.bind(this);
    this.stopPropagation = this.stopPropagation.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.updateFontSize = this.updateFontSize.bind(this);
    this.restartCandleAnimation = this.restartCandleAnimation.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.updateFontSize);
    this.updateFontSize();
    this.candleLoopTimer = window.setInterval(this.restartCandleAnimation, 3200);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.text !== this.props.text
      || prevProps.heading !== this.props.heading
    ) {
      this.updateFontSize();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.updateFontSize);
    if (this.candleLoopTimer) {
      window.clearInterval(this.candleLoopTimer);
    }
  }

  updateFontSize() {
    const { text, heading } = this.props;
    this.setState({ fontSize: computePrayerFontSize(text, heading) });
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
    const { fontSize } = this.state;

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
              <p
                className="prayer-reading-text"
                style={{ fontSize: `calc(${fontSize}px * var(--font-scale-prayers, 1))` }}
              >
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
