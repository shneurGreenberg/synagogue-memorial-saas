import React from 'react';

export class BiographyScroller extends React.Component {
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
  }

  componentDidUpdate(prevProps) {
    if (prevProps.html !== this.props.html) {
      this.updateScrollBehavior();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateScrollBehavior);
  }

  updateScrollBehavior = () => {
    requestAnimationFrame(() => {
      const viewport = this.viewportRef.current;
      const track = this.trackRef.current;

      if (!viewport || !track) {
        return;
      }

      const contentHeight = this.state.shouldScroll
        ? track.scrollHeight / 2
        : track.scrollHeight;

      if (contentHeight <= viewport.clientHeight + 4) {
        if (this.state.shouldScroll) {
          this.setState({ shouldScroll: false });
        }
        return;
      }

      const pixelsPerSecond = 22;
      const durationSec = Math.max(contentHeight / pixelsPerSecond, 60);

      if (!this.state.shouldScroll) {
        this.setState({ shouldScroll: true, durationSec }, () => {
          this.updateScrollBehavior();
        });
        return;
      }

      if (Math.abs(this.state.durationSec - durationSec) > 2) {
        this.setState({ durationSec });
      }
    });
  };

  renderBlock(suffix) {
    const { html, className } = this.props;

    return (
      <div
        key={suffix}
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  render() {
    const { className } = this.props;

    return (
      <div className="biography-scroll-viewport" ref={this.viewportRef}>
        <div
          className={`biography-scroll-track${this.state.shouldScroll ? ' is-scrolling' : ''}`}
          ref={this.trackRef}
          style={this.state.shouldScroll ? { animationDuration: `${this.state.durationSec}s` } : undefined}
        >
          {this.renderBlock('a')}
          {this.state.shouldScroll && this.renderBlock('b')}
        </div>
      </div>
    );
  }
}
