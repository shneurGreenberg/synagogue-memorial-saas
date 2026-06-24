import React from 'react';

import {
  candlePosterUrl,
  getCandleRenderMode,
  subscribeCandleCanvas,
  subscribeCandleStatus,
} from '../lib/candle-video-pool';

export class CandleVideo extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
    this.subscription = null;
    this.statusUnsubscribe = null;
    this.state = {
      renderMode: getCandleRenderMode(),
      posterFailed: false,
    };
  }

  componentDidMount() {
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

  render() {
    const { className = 'candle', active = true } = this.props;
    const { renderMode, posterFailed } = this.state;

    if (!active) {
      return null;
    }

    if (renderMode === 'fallback') {
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

    return (
      <canvas
        ref={this.canvasRef}
        className={className}
        aria-hidden="true"
      />
    );
  }
}
