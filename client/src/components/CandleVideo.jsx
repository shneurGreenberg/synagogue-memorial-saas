import React from 'react';

import { shouldUseStaticCandleOnly } from '../lib/legacy-browser';
import {
  candlePosterUrl,
  getCandleRenderMode,
  subscribeCandleCanvas,
  subscribeCandleStatus,
} from '../lib/candle-video-pool';

function StaticCandleImage({ className = 'candle' }) {
  return (
    <img
      className={`${className} candle-static-image`}
      src={candlePosterUrl()}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  );
}

export class CandleVideo extends React.Component {
  constructor(props) {
    super(props);
    this.staticOnly = shouldUseStaticCandleOnly();
    this.canvasRef = React.createRef();
    this.subscription = null;
    this.statusUnsubscribe = null;
    this.state = {
      renderMode: this.staticOnly ? 'fallback' : getCandleRenderMode(),
      posterFailed: false,
    };
  }

  componentDidMount() {
    if (this.staticOnly) {
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
    if (this.staticOnly) {
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
        decoding="async"
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

    if (this.staticOnly) {
      return <StaticCandleImage className={className} />;
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
