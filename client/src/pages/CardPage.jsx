import React from 'react';
import { withTranslation } from 'react-i18next';
import { sanitizeRichText } from '../lib/html-sanitize';
import { getBiographyDensityClass } from '../lib/text-density';
import { PersonAvatar } from '../components/PersonAvatar';
import { useBoardNavigation } from '../context/BoardNavigationContext';
import { useBoardData } from '../context/BoardDataContext';
import { BiographyScroller } from '../components/BiographyScroller';

class CardPageBase extends React.Component {
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

    this.props.onBack();
  }

  onKeyDown(event) {
    if (event.key === 'Escape') {
      this.props.onBack();
    }
  }

  stopPropagation(event) {
    event.stopPropagation();
  }

  renderDetail(card) {
    const displayName = card ? card.name : '';

    return (
      <main className="card-view wooden-panel">
        <div
          className="card-detail golden-panel"
          role="article"
        >
          <div className="card-detail-photo">
            <PersonAvatar person={card} size="xl" />
          </div>
          <div className="card-detail-text">
            <h1>{displayName}</h1>
            <BiographyScroller
              className={`inner-text ${getBiographyDensityClass(card.text)}`}
              html={sanitizeRichText(card.text)}
            />
          </div>
        </div>
      </main>
    );
  }

  renderMissing() {
    return (
      <main className="card-view wooden-panel card-view-missing">
        <div className="card-detail golden-panel">
          <h1>{this.props.t('person_not_found')}</h1>
          <p>
            <button type="button" className="card-back-link" onClick={this.props.onBack}>
              {this.props.t('back_to_board')}
            </button>
          </p>
        </div>
      </main>
    );
  }

  render() {
    const { card } = this.props;

    return (
      <div
        className="card-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={this.props.t('back_to_board')}
        onClick={this.onOverlayClick}
      >
        <div className="card-popup" onClick={this.stopPropagation}>
          {card ? this.renderDetail(card) : this.renderMissing()}
        </div>
      </div>
    );
  }
}

const CardPageTranslated = withTranslation()(CardPageBase);

export default function CardPage({ personId }) {
  const { goToBoard } = useBoardNavigation();
  const { data, revision } = useBoardData();
  const people = data.people || [];
  const card = people.find((person) => String(person.id) === String(personId));

  return (
    <CardPageTranslated
      key={`card-${revision}-${personId}`}
      card={card}
      onBack={goToBoard}
    />
  );
}
