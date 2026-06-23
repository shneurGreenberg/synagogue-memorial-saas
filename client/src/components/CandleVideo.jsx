import React from 'react';
import { assetUrl } from '../lib/asset-url';

export class CandleVideo extends React.Component {
  constructor(props) {
    super(props);
    this.videoRef = React.createRef();
    this.playVideo = this.playVideo.bind(this);
  }

  componentDidMount() {
    this.playVideo();
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.active && this.props.active) {
      this.playVideo();
    }
  }

  componentWillUnmount() {
    const video = this.videoRef.current;
    if (video) {
      video.pause();
    }
  }

  playVideo() {
    const video = this.videoRef.current;
    if (!video) {
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }

  render() {
    const { className = 'candle', active = true } = this.props;

    if (!active) {
      return null;
    }

    return (
      <video
        ref={this.videoRef}
        className={className}
        src={assetUrl('images/candle.mp4')}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onLoadedData={this.playVideo}
      />
    );
  }
}
