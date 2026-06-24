import React from 'react';

import { isLegacyBoardBrowser } from '../lib/legacy-browser';
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
    this.canvasRef = React.createRef();
    this.subscription = null;
    this.statusUnsubscribe = null;
    this.state = {
      renderMode: this.legacy ? 'fallback' : getCandleRenderMode(),
      posterFailed: false,
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

      this.setState({ renderMode });
    });
    this.bindCanvas();
  }

  componentDidUpdate(prevProps) {
    if (this.legacy) {
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
