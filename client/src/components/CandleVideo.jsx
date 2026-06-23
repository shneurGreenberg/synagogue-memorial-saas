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
    };
  }

  componentDidMount() {
    this.statusUnsubscribe = subscribeCandleStatus((renderMode) => {
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

  render() {
    const { className = 'candle', active = true } = this.props;
    const { renderMode } = this.state;

    if (!active) {
      return null;
    }

    if (renderMode === 'fallback') {
      return (
        <img
          className={`${className} candle-fallback`}
          src={candlePosterUrl()}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading="lazy"
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
