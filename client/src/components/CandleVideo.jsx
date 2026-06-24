import React from 'react';

import { assetUrl } from '../lib/asset-url';
import { isLegacyBoardBrowser, isLowPowerBoardBrowser } from '../lib/legacy-browser';
import {
  candlePosterUrl,
  getCandleRenderMode,
  subscribeCandleCanvas,
  subscribeCandleStatus,
} from '../lib/candle-video-pool';

const DIRECT_VIDEO_PLAY_RETRIES = 4;
const DIRECT_VIDEO_RETRY_MS = 1500;

export class CandleVideo extends React.Component {
  constructor(props) {
    super(props);
    this.legacy = isLegacyBoardBrowser();
    this.lowPower = isLowPowerBoardBrowser();
    this.canvasRef = React.createRef();
    this.videoRef = React.createRef();
    this.visibilityObserver = null;
    this.subscription = null;
    this.statusUnsubscribe = null;
    this.playRetryTimer = null;
    this.playRetryCount = 0;
    this.isVisible = true;
    this.state = {
      renderMode: this.legacy ? 'fallback' : getCandleRenderMode(),
      posterFailed: false,
      directVideoFailed: false,
    };
  }

  componentDidMount() {
    if (this.legacy) {
      return;
    }

    if (this.lowPower) {
      window.requestAnimationFrame(() => {
        this.observeDirectVideo();
      });
      return;
    }

    this.statusUnsubscribe = subscribeCandleStatus((renderMode) => {
      if (renderMode === 'fallback') {
        this.subscription?.unsubscribe();
        this.subscription = null;
      }

      this.setState({ renderMode });
    });

    if (this.state.renderMode !== 'fallback') {
      this.bindCanvas();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.legacy) {
      return;
    }

    if (this.lowPower) {
      if (prevProps.active !== this.props.active) {
        this.syncDirectVideoPlayback();
      }
      if (!this.visibilityObserver && this.videoRef.current) {
        this.observeDirectVideo();
      }
      return;
    }

    if (prevProps.active !== this.props.active) {
      this.subscription?.setActive(this.props.active);
    }

    if (!this.subscription && this.state.renderMode !== 'fallback') {
      this.bindCanvas();
    }
  }

  componentWillUnmount() {
    this.clearPlayRetry();
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.statusUnsubscribe?.();
    this.statusUnsubscribe = null;
  }

  clearPlayRetry() {
    if (this.playRetryTimer) {
      window.clearTimeout(this.playRetryTimer);
      this.playRetryTimer = null;
    }
  }

  schedulePlayRetry() {
    if (this.playRetryCount >= DIRECT_VIDEO_PLAY_RETRIES || this.state.directVideoFailed) {
      return;
    }

    this.clearPlayRetry();
    this.playRetryCount += 1;
    this.playRetryTimer = window.setTimeout(() => {
      this.playRetryTimer = null;
      this.syncDirectVideoPlayback();
    }, DIRECT_VIDEO_RETRY_MS);
  }

  bindCanvas() {
    const canvas = this.canvasRef.current;
    if (!canvas || this.subscription || this.state.renderMode === 'fallback') {
      return;
    }

    this.subscription = subscribeCandleCanvas(canvas, {
      active: this.props.active !== false,
    });
  }

  observeDirectVideo() {
    const video = this.videoRef.current;
    if (!video) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.isVisible = true;
      this.syncDirectVideoPlayback();
      return;
    }

    if (this.visibilityObserver) {
      this.syncDirectVideoPlayback();
      return;
    }

    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.isVisible = Boolean(entries[0]?.isIntersecting);
      this.syncDirectVideoPlayback();
    }, { threshold: 0.01, rootMargin: '40px' });

    this.visibilityObserver.observe(video);
    this.syncDirectVideoPlayback();

    window.setTimeout(() => {
      if (!this.isVisible) {
        this.isVisible = true;
        this.syncDirectVideoPlayback();
      }
    }, 300);
  }

  syncDirectVideoPlayback() {
    const video = this.videoRef.current;
    if (!video || this.state.directVideoFailed) {
      return;
    }

    const shouldPlay = this.props.active !== false && this.isVisible;

    if (!shouldPlay) {
      video.pause();
      return;
    }

    if (video.readyState < 2) {
      try {
        video.load();
      } catch {
        /* ignore load errors on legacy TVs */
      }
      this.schedulePlayRetry();
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.then(() => {
        this.playRetryCount = 0;
        this.clearPlayRetry();
      }).catch(() => {
        this.schedulePlayRetry();
      });
    }
  }

  onDirectVideoError = () => {
    this.setState({ directVideoFailed: true });
    this.clearPlayRetry();
  };

  onDirectVideoReady = () => {
    this.playRetryCount = 0;
    this.syncDirectVideoPlayback();
  };

  onPosterError = () => {
    this.setState({ posterFailed: true });
  };

  renderLegacy() {
    return this.renderPosterFallback(this.props.className || 'candle');
  }

  renderPosterFallback(className) {
    const { posterFailed } = this.state;

    if (posterFailed) {
      return (
        <div
          className={`${className} candle-fallback candle-fallback-css`}
          aria-hidden="true"
        />
      );
    }

    return (
      <img
        className={`${className} candle-fallback`}
        src={candlePosterUrl()}
        alt=""
        aria-hidden="true"
        decoding="sync"
        onError={this.onPosterError}
      />
    );
  }

  renderDirectVideo(className) {
    const { directVideoFailed } = this.state;

    if (directVideoFailed) {
      return this.renderPosterFallback(className);
    }

    return (
      <video
        ref={this.videoRef}
        className={`${className} candle-video`}
        src={assetUrl('images/candle.mp4')}
        poster={candlePosterUrl()}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
        onError={this.onDirectVideoError}
        onLoadedData={this.onDirectVideoReady}
        onCanPlay={this.onDirectVideoReady}
      />
    );
  }

  render() {
    const { className = 'candle', active = true } = this.props;
    const { renderMode } = this.state;

    if (!active) {
      return null;
    }

    if (this.legacy) {
      return this.renderLegacy();
    }

    if (this.lowPower) {
      return this.renderDirectVideo(className);
    }

    if (renderMode === 'fallback') {
      return this.renderPosterFallback(className);
    }

    return (
      <canvas
        ref={this.canvasRef}
        className={className}
        aria-hidden="true"
      />
    );
  }
}
