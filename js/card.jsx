const React = require('react');
const ReactDOM = require('react-dom');
const { configureNovosibirsk } = require('./novosibirsk');
require('./i18n');
const { withTranslation } = require('react-i18next');
const { sanitizeRichText } = require('./html-sanitize');
const { PersonAvatar } = require('./person-ui');

configureNovosibirsk();

class CardViewBase extends React.Component {
  constructor(props) {
    super(props);

    const components = window.location.pathname.split('/');
    const id = parseInt(components[components.length - 1], 10);
    const card = (window.data.people || []).find((a) => a.id == id);

    this.state = { card };
  }

  render() {
    const { card } = this.state;

    if (!card) {
      return (
        <main className="card-view wooden-panel card-view-missing">
          <h1>{this.props.t('person_not_found')}</h1>
          <p>
            <a href={window.data.baseUrl}>{this.props.t('back_to_board')}</a>
          </p>
        </main>
      );
    }

    return (
      <main className="card-view wooden-panel">
        <div className="card-detail golden-panel">
          <div className="card-detail-photo">
            <PersonAvatar person={card} size="xl" />
          </div>
          <div className="card-detail-text">
            <h1>{card.name}</h1>
            <div
              className="inner-text"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(card.text) }}
            />
          </div>
        </div>
      </main>
    );
  }
}

const CardView = withTranslation()(CardViewBase);

ReactDOM.render(
  <CardView />,
  document.getElementById('main-entry'),
);
