import React from 'react';

export class MemorialPrayersPanel extends React.Component {
  constructor(props) {
    super(props);
    this.viewportRef = React.createRef();
    this.trackRef = React.createRef();
    this.state = {
      shouldScroll: false,
      durationSec: 120,
    };
  }

  componentDidMount() {
    this.updateScrollBehavior();
    window.addEventListener('resize', this.updateScrollBehavior);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.kelMaleText !== this.props.kelMaleText
      || prevProps.izkorText !== this.props.izkorText
      || prevProps.big !== this.props.big
    ) {
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

      const pixelsPerSecond = 16;
      const durationSec = Math.max(contentHeight / pixelsPerSecond, 90);

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

  renderPrayerBlock(id, heading, text, extraClass) {
    return (
      <section
        className={`memorial-prayer-block ${extraClass || ''}`}
        aria-labelledby={id}
      >
        <h1 id={id}>{heading}</h1>
        <div className="prayer-text">{text}</div>
      </section>
    );
  }

  renderContent(suffix) {
    const {
      memorialPrayerLabel,
      kelMaleHeading,
      kelMaleText,
      izkorHeading,
      izkorText,
      showKelMale = true,
      showIzkor = true,
    } = this.props;

    return (
      <div className="memorial-prayers-inner" key={suffix}>
        {(showKelMale && showIzkor) && <h2>{memorialPrayerLabel}</h2>}
        {showKelMale && this.renderPrayerBlock(
          `kel-male-heading${suffix}`,
          kelMaleHeading,
          kelMaleText,
          'kel-male',
        )}
        {showIzkor && this.renderPrayerBlock(
          `yizkor-heading${suffix}`,
          izkorHeading,
          izkorText,
          'yizkor',
        )}
      </div>
    );
  }

  render() {
    const { big, showKelMale = true, showIzkor = true } = this.props;

    if (!showKelMale && !showIzkor) {
      return null;
    }

    return (
      <div className={`memorial-prayers ${big ? 'memorial-prayers-big' : ''}`}>
        <div className="memorial-prayers-scroll" ref={this.viewportRef}>
          <div
            className={`memorial-prayers-track${this.state.shouldScroll ? ' is-scrolling' : ''}`}
            ref={this.trackRef}
            style={this.state.shouldScroll ? { animationDuration: `${this.state.durationSec}s` } : undefined}
          >
            {this.renderContent('')}
            {this.state.shouldScroll && this.renderContent('-dup')}
          </div>
        </div>
      </div>
    );
  }
}
