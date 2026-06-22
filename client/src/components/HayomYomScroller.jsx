import React from 'react';

export class HayomYomScroller extends React.Component {
  constructor(props) {
    super(props);
    this.viewportRef = React.createRef();
    this.trackRef = React.createRef();
    this.state = {
      shouldScroll: false,
      durationSec: 90,
    };
  }

  componentDidMount() {
    this.updateScrollBehavior();
    window.addEventListener('resize', this.updateScrollBehavior);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateScrollBehavior();
      });

      if (this.viewportRef.current) {
        this.resizeObserver.observe(this.viewportRef.current);
      }
      if (this.trackRef.current) {
        this.resizeObserver.observe(this.trackRef.current);
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.text !== this.props.text) {
      this.updateScrollBehavior();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateScrollBehavior);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  measureContentHeight(track) {
    const inner = track.querySelector('.hayom-yom-inner');
    if (inner) {
      return inner.getBoundingClientRect().height;
    }

    return track.scrollHeight;
  }

  updateScrollBehavior = () => {
    requestAnimationFrame(() => {
      const viewport = this.viewportRef.current;
      const track = this.trackRef.current;

      if (!viewport || !track) {
        return;
      }

      const contentHeight = this.measureContentHeight(track);
      const needsScroll = contentHeight > viewport.clientHeight + 4;

      if (!needsScroll) {
        if (this.state.shouldScroll) {
          this.setState({ shouldScroll: false, durationSec: 90 });
        }
        return;
      }

      const rootStyles = getComputedStyle(document.documentElement);
      const sidebarScale = parseFloat(rootStyles.getPropertyValue('--font-scale-sidebar')) || 1;
      const pixelsPerSecond = 14 * sidebarScale;
      const durationSec = Math.max(contentHeight / pixelsPerSecond, 60);

      if (!this.state.shouldScroll) {
        this.setState({ shouldScroll: true, durationSec });
        return;
      }

      if (Math.abs(this.state.durationSec - durationSec) > 2) {
        this.setState({ durationSec });
      }
    });
  };

  renderBlock(suffix) {
    const { text } = this.props;

    return (
      <div className="hayom-yom-inner" key={suffix}>
        <p className="hayom-yom-text">{text}</p>
      </div>
    );
  }

  render() {
    const { text } = this.props;

    if (!text) {
      return null;
    }

    return (
      <div className="hayom-yom-scroll" ref={this.viewportRef}>
        <div
          className={`hayom-yom-track${this.state.shouldScroll ? ' is-scrolling' : ''}`}
          ref={this.trackRef}
          style={this.state.shouldScroll ? { animationDuration: `${this.state.durationSec}s` } : undefined}
        >
          {this.renderBlock('')}
          {this.state.shouldScroll && this.renderBlock('-dup')}
        </div>
      </div>
    );
  }
}
