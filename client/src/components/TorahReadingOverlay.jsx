import React from 'react';
import { createPortal } from 'react-dom';
import { withTranslation } from 'react-i18next';

class TorahReadingOverlayBase extends React.Component {
  constructor(props) {
    super(props);
    this.onOverlayClick = this.onOverlayClick.bind(this);
    this.stopPropagation = this.stopPropagation.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
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
          <div className="torah-reading-names">
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
