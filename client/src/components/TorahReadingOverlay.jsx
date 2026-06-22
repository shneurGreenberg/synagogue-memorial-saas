import React from 'react';
import { createPortal } from 'react-dom';
import { withTranslation } from 'react-i18next';

const COLUMN_COUNT = 3;

function splitIntoColumns(names, columnCount = COLUMN_COUNT) {
  const columns = Array.from({ length: columnCount }, () => []);
  names.forEach((name, index) => {
    columns[index % columnCount].push(name);
  });
  return columns;
}

function computeNameFontSize(names) {
  const count = Math.max(names.length, 1);
  const rows = Math.ceil(count / COLUMN_COUNT);
  const longest = Math.max(...names.map((name) => name.length), 1);
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const headerSpace = 56;
  const verticalPadding = 28;
  const horizontalPadding = 24;
  const columnGap = 16;
  const availableHeight = vh - headerSpace - verticalPadding;
  const availableWidth = vw - horizontalPadding;
  const columnWidth = (availableWidth - columnGap * (COLUMN_COUNT - 1)) / COLUMN_COUNT;
  const rowGap = Math.min(16, availableHeight / (rows * 8));
  const heightPerRow = (availableHeight - rowGap * Math.max(rows - 1, 0)) / rows;
  const fromHeight = heightPerRow * 0.78;
  const fromWidth = (columnWidth * 0.94) / (longest * 0.5);
  return Math.max(14, Math.min(fromHeight, fromWidth, 160));
}

class TorahReadingOverlayBase extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fontSize: 48 };
    this.onOverlayClick = this.onOverlayClick.bind(this);
    this.stopPropagation = this.stopPropagation.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.updateFontSize = this.updateFontSize.bind(this);
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
    const columns = splitIntoColumns(names);

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
            className="torah-reading-names"
            style={{ '--torah-name-size': `${fontSize}px` }}
          >
            {names.length > 0 ? columns.map((column, columnIndex) => (
              <div key={`column-${columnIndex}`} className="torah-reading-column">
                {column.map((name) => (
                  <p key={name} className="torah-reading-name">{name}</p>
                ))}
              </div>
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
