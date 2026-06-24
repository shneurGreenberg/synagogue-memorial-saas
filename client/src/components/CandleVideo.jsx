import React from 'react';

import { assetUrl } from '../lib/asset-url';
import { isLegacyBoardBrowser, isLowPowerBoardBrowser } from '../lib/legacy-browser';
import {
  candlePosterUrl,
  getCandleRenderMode,
  subscribeCandleCanvas,
  subscribeCandleStatus,
} from '../lib/candle-video-pool';

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

    this.statusUnsubscribe = subscribeCandleStatus((renderMode) => {
      if (renderMode === 'fallback') {
        this.subscription?.unsubscribe();
        this.subscription = null;
      }

      this.setState({ renderMode }, () => {
        if (renderMode === 'fallback' && this.lowPower) {
          this.observeDirectVideo();
        }
      });
    });

    if (this.state.renderMode !== 'fallback') {
      this.bindCanvas();
    } else if (this.lowPower) {
      this.observeDirectVideo();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.legacy) {
      return;
    }

    if (this.state.renderMode === 'fallback' && this.lowPower) {
      if (prevProps.active !== this.props.active) {
        this.syncDirectVideoPlayback();
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
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.statusUnsubscribe?.();
    this.statusUnsubscribe = null;
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
      this.syncDirectVideoPlayback();
      return;
    }

    if (this.visibilityObserver) {
      return;
    }

    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.isVisible = Boolean(entries[0]?.isIntersecting);
      this.syncDirectVideoPlayback();
    }, { threshold: 0.01 });

    this.visibilityObserver.observe(video);
    this.syncDirectVideoPlayback();
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

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        this.setState({ directVideoFailed: true });
      });
    }
  }

  onDirectVideoError = () => {
    this.setState({ directVideoFailed: true });
  };

  onPosterError = () => {
    this.setState({ posterFailed: true });
  };

  renderLegacy() {
    const { className = 'candle' } = this.props;

    return (
      <div
        className={`${className} candle-fallback candle-fallback-css`}
        aria-hidden="true"
      />
    );
  }

  renderFallback(className) {
    const { posterFailed, directVideoFailed } = this.state;

    if (this.lowPower && !directVideoFailed) {
      return (
        <video
          ref={this.videoRef}
          className={className}
          src={assetUrl('images/candle.mp4')}
          poster={candlePosterUrl()}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-hidden="true"
          onError={this.onDirectVideoError}
        />
      );
    }

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

  render() {
    const { className = 'candle', active = true } = this.props;
    const { renderMode } = this.state;

    if (!active) {
      return null;
    }

    if (this.legacy) {
      return this.renderLegacy();
    }

    if (renderMode === 'fallback') {
      return this.renderFallback(className);
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
