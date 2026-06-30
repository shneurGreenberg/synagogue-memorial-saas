import React from 'react';
import { createPortal } from 'react-dom';
import { withTranslation } from 'react-i18next';
import { assetUrl } from '../lib/asset-url';
import { CandleVideo } from './CandleVideo';

class PrayerReadingOverlayBase extends React.Component {
  constructor(props) {
    super(props);
    this.audioRef = React.createRef();
    this.state = { isPlaying: false };
    this.onOverlayClick = this.onOverlayClick.bind(this);
    this.stopPropagation = this.stopPropagation.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.toggleAudio = this.toggleAudio.bind(this);
    this.stopAudio = this.stopAudio.bind(this);
    this.onAudioEnded = this.onAudioEnded.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
    this.stopAudio();
  }

  stopAudio() {
    const audio = this.audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    if (this.state.isPlaying) {
      this.setState({ isPlaying: false });
    }
  }

  onAudioEnded() {
    this.setState({ isPlaying: false });
  }

  toggleAudio() {
    const audio = this.audioRef.current;
    if (!audio) {
      return;
    }

    if (this.state.isPlaying) {
      audio.pause();
      this.setState({ isPlaying: false });
      return;
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        this.setState({ isPlaying: false });
      });
    }
    this.setState({ isPlaying: true });
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
    const {
      sectionTitle,
      text,
      transliterationText,
      extraClass,
      audioSrc,
      onClose,
      t,
      i18n,
    } = this.props;
    const resolvedAudioSrc = audioSrc || assetUrl('audio/prayer-placeholder.mp3');
    const playLabel = this.state.isPlaying ? t('pause_prayer') : t('play_prayer');
    const language = i18n?.language || 'ru';
    const showTransliteration = language !== 'he' && transliterationText;

    return createPortal(
      <div
        className="prayer-reading-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={sectionTitle || t('memorial_prayer')}
        onClick={this.onOverlayClick}
      >
        <div className="prayer-reading-popup golden-panel" onClick={this.stopPropagation}>
          <button type="button" className="prayer-reading-close" onClick={onClose}>
            {t('close')}
          </button>
          <div className={`prayer-reading-layout ${extraClass || ''}`}>
            <div className="prayer-reading-candle-side" aria-hidden="true">
              <CandleVideo className="prayer-reading-candle" />
            </div>
            <div className="prayer-reading-content">
              {sectionTitle && <h1 className="prayer-reading-heading">{sectionTitle}</h1>}
              <p className="prayer-reading-text">
                {text}
              </p>
              {showTransliteration && (
                <div className="prayer-reading-transliteration-block">
                  <h2 className="prayer-reading-transliteration-label">
                    {t('prayer_text_transliteration_label')}
                  </h2>
                  <p
                    className="prayer-reading-transliteration-text"
                    dir="ltr"
                    lang={language}
                  >
                    {transliterationText}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="prayer-reading-footer">
            <audio
              ref={this.audioRef}
              src={resolvedAudioSrc}
              preload="none"
              onEnded={this.onAudioEnded}
            />
            <button
              type="button"
              className="prayer-reading-play"
              onClick={this.toggleAudio}
              aria-label={playLabel}
            >
              {playLabel}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }
}

export const PrayerReadingOverlay = withTranslation()(PrayerReadingOverlayBase);
