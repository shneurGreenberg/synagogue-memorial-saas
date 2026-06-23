import React from 'react';

import { subscribeCandleCanvas } from '../lib/candle-video-pool';

export class CandleVideo extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
    this.subscription = null;
  }

  componentDidMount() {
    this.bindCanvas();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.active !== this.props.active) {
      this.subscription?.setActive(this.props.active);
    }

    if (!this.subscription) {
      this.bindCanvas();
    }
  }

  componentWillUnmount() {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  bindCanvas() {
    const canvas = this.canvasRef.current;
    if (!canvas || this.subscription) {
      return;
    }

    this.subscription = subscribeCandleCanvas(canvas, {
      active: this.props.active !== false,
    });
  }

  render() {
    const { className = 'candle', active = true } = this.props;

    if (!active) {
      return null;
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
