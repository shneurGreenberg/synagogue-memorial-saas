const Hebcal = require('hebcal');
const React = require('react');
const ReactDOM = require('react-dom');
const { configureNovosibirsk } = require('./novosibirsk');
require('./i18n');
const { withTranslation } = require('react-i18next');

configureNovosibirsk();

class CardViewBase extends React.Component {
  constructor(props) {
    super(props);

    const components = window.location.pathname.split('/');
    // Path is /s/:slug/card/:id
    // components: ["", "s", "slug", "card", "id"]
    const id = parseInt(components[components.length - 1]);
    const card = window.data.people.find((a) => a.id == id);

    this.state = {
      card
    };
  }

  render() {
    return <div className="card-view wooden-panel">
      <table className="golden-panel">
        <tbody>
          <tr>
            <td className="text">
              <h1>{this.state.card.name}</h1>
              <div className="inner-text" dangerouslySetInnerHTML={{ __html: this.state.card.text }}></div>
            </td>
            <td className="photo-container">
              {this.state.card.photo && <img src={`/photos/${this.state.card.photo}`} />}
            </td>
          </tr>
        </tbody>
      </table>
    </div>;
  }
}

const CardView = withTranslation()(CardViewBase);

ReactDOM.render(
  <CardView />,
  document.getElementById('main-entry'),
);
