import React from 'react';
import { createPortal } from 'react-dom';
import { withTranslation } from 'react-i18next';

function computeNameFontSize(names) {
  const count = Math.max(names.length, 1);
  const longest = Math.max(...names.map((name) => name.length), 1);
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const headerSpace = 56;
  const verticalPadding = 32;
  const availableHeight = vh - headerSpace - verticalPadding;
  const gap = Math.min(20, availableHeight / (count * 6));
  const heightPerName = (availableHeight - gap * Math.max(count - 1, 0)) / count;
  const fromHeight = heightPerName * 0.72;
  const fromWidth = (vw * 0.94) / (longest * 0.52);
  return Math.max(14, Math.min(fromHeight, fromWidth, 140));
}

class TorahReadingOverlayBase extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fontSize: 48 };
    this.onOverlayClick = this.onOverlayClick.bind(this);
    this.stopPropagation = this.stopPropagation.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.updateFontSize = this.updateFontSize.bind(this);
    this.namesRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.updateFontSize);
    this.updateFontSize();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.names !== this.props.names) {
      this.updateFontSize();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.updateFontSize);
  }

  updateFontSize() {
    const { names } = this.props;
    this.setState({ fontSize: computeNameFontSize(names) });
  }

  onOverlayClick(event) {
    if (event.target !== event.currentTarget) {
      return;
    }

    this.props.onClose();
  }

  onKeyDown(event) {
    if (event.key === 'Escape') {
      this.props.onClose();
    }
  }

  stopPropagation(event) {
    event.stopPropagation();
  }

  render() {
    const { names, onClose, t } = this.props;
    const { fontSize } = this.state;

    return createPortal(
      <div
        className="torah-reading-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={t('torah_reading_names')}
        onClick={this.onOverlayClick}
      >
        <div className="torah-reading-popup" onClick={this.stopPropagation}>
          <button type="button" className="torah-reading-close" onClick={onClose}>
            {t('close')}
          </button>
          <div
            ref={this.namesRef}
            className="torah-reading-names"
            style={{ '--torah-name-size': `${fontSize}px` }}
          >
            {names.length > 0 ? names.map((name) => (
              <p key={name} className="torah-reading-name">{name}</p>
            )) : (
              <p className="torah-reading-empty">—</p>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );
  }
}

export const TorahReadingOverlay = withTranslation()(TorahReadingOverlayBase);
