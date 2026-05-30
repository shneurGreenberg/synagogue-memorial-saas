import React from 'react';
import { withTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { sanitizeRichText } from '../lib/html-sanitize';
import { getBiographyDensityClass } from '../lib/text-density';
import { PersonAvatar } from '../components/PersonAvatar';
import { useBoardNavigation } from '../context/BoardNavigationContext';
import { useBoardData } from '../context/BoardDataContext';
import { BiographyScroller } from '../components/BiographyScroller';

class CardPageBase extends React.Component {
  constructor(props) {
    super(props);
    this.onBackdropClick = this.onBackdropClick.bind(this);
    this.stopPropagation = this.stopPropagation.bind(this);
  }

  onBackdropClick(event) {
    if (event.target === event.currentTarget) {
      this.props.onBack();
    }
  }

  stopPropagation(event) {
    event.stopPropagation();
  }

  render() {
    const { card } = this.props;
    const displayName = card ? card.name : '';

    if (!card) {
      return (
        <main
          className="card-view wooden-panel card-view-missing"
          onClick={this.onBackdropClick}
          role="presentation"
        >
          <div className="card-detail golden-panel" onClick={this.stopPropagation}>
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

    return (
      <main
        className="card-view wooden-panel"
        onClick={this.onBackdropClick}
        role="presentation"
        aria-label={this.props.t('back_to_board')}
      >
        <div
          className="card-detail golden-panel"
          onClick={this.stopPropagation}
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
}

const CardPageTranslated = withTranslation()(CardPageBase);

export default function CardPage() {
  const { personId } = useParams();
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
