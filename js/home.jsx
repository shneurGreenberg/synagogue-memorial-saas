const Hebcal = require('hebcal');
const React = require('react');
const ReactDOM = require('react-dom');
const {
  configureNovosibirsk,
  formatHebrewDate,
  formatGregorianDate,
  CURRENT_DAY_OF_YEAR,
  DAYS_IN_YEAR,
  gregorianDayOfYear,
  translit,
  translitSplit,
} = require('./novosibirsk');
const Clock = require('react-live-clock');
require('./i18n');
const { withTranslation } = require('react-i18next');

configureNovosibirsk();

const CANDLE_LOOP_LENGTH = 104;

class CardBase extends React.Component {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.state = {
      candleHash: 0,
      candleTimeout: null,
    };
  }

  componentDidMount() {
    const shift = Math.round(Math.random() * CANDLE_LOOP_LENGTH);
    const left = CANDLE_LOOP_LENGTH - shift;

    this.setCandleTimeout(left);
  }

  componentWillUnmount() {
    this.tearDownCandle();
  }

  setCandleTimeout(left) {
    this.setState((state) => {
      if (state.candleTimeout) {
        clearTimeout(state.candleTimeout);
      }

      state.candleHash = Math.random();

      state.candleTimeout = setTimeout(
        () => {
          this.setCandleTimeout(CANDLE_LOOP_LENGTH);
        },

        left * 1000
      );

      return state;
    });
  }

  tearDownCandle() {
    if (!this.state.candleTimeout) {
      return;
    }

    this.setState((state) => {
      if (!this.state.candleTimeout) {
        return;
      }

      clearTimeout(state.candleTimeout);

      state.candleTimeout = null;

      return state;
    });
  }

  onClick() {
    window.location.href = `${data.baseUrl}/card/${this.props.entry.id}`;
  }

  render() {
    return <div className={`
      card
      golden-panel
      ${!this.props.entry ? 'card-hidden' : ''}
      ${this.props.big ? 'card-big' : ''}
      ${this.props.entry && this.props.entry.passedToday ? 'passed-today' : ''}
      ${this.props.entry && this.props.entry.passedToday && !this.props.big ? 'card-outline' : ''}
    `} onClick={this.onClick}>
      {
        this.props.entry && <div className="candle" style={{ 'backgroundImage': `url("/images/candle.webp?hash=${this.state.candleHash}")` }}></div>
      }
      {
        this.props.entry && <div className="inner">
          <h3>{this.props.entry.name}</h3>
          <time>{formatGregorianDate(this.props.entry.gregorianDateOfDeath)}</time>
          <br />
          <time>{formatHebrewDate(this.props.entry.hebrewDateOfDeath)}</time>
          {
            this.props.entry.title && this.props.big && <div className="title">{this.props.entry.title}</div>
          }
          <div className="placeholder"></div>
        </div>
      }
      {
        this.props.entry && <button>{this.props.t('learn_more')}</button>
      }
    </div>;
  }
}

const Card = withTranslation()(CardBase);

class Slideshow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentIndex: 0
    };
  }

  componentDidMount() {
    this.startTimer();
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  startTimer() {
    this.timer = setTimeout(() => {
      this.nextSlide();
    }, this.props.interval * 1000);
  }

  nextSlide() {
    const nextIndex = this.state.currentIndex + 1;
    if (nextIndex >= this.props.images.length) {
      this.props.onFinish();
    } else {
      this.setState({ currentIndex: nextIndex });
      this.startTimer();
    }
  }

  render() {
    const slide = this.props.images[this.state.currentIndex];
    if (!slide) return null;

    return (
      <div className="slideshow-container" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        backgroundColor: 'black',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img src={`/images/${slide.url}`} style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }} />
        {slide.text && <div style={{
          position: 'absolute',
          bottom: '50px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '20px',
          fontSize: '2em',
          borderRadius: '10px'
        }}>
          {slide.text}
        </div>}
      </div>
    );
  }
}

class HomePageBase extends React.Component {
  constructor() {
    super();

    const hebrewDate = new Hebcal.HDate();
    const currentHebrewMonth = hebrewDate.getMonth();
    const currentHebrewDate = hebrewDate.getDate();

    const dailyCite = data.dailyCites.find((entry) => {
      if (entry.hebrewDate.month != currentHebrewMonth) {
        return false;
      }

      if (entry.hebrewDate.date != currentHebrewDate) {
        return false;
      }

      return true;
    });

    function setDates(card) {
      if (!card.gregorianDateOfDeath.year) {
        return card;
      }

      const gregorianDateOfDeath = new Date(
        card.gregorianDateOfDeath.year,
        card.gregorianDateOfDeath.month - 1,
        card.gregorianDateOfDeath.date,
      );

      card.gregorianDateOfDeath = gregorianDateOfDeath;
      card.hebrewDateOfDeath = new Hebcal.HDate(gregorianDateOfDeath);

      return card;
    }

    const allPeople = data
      .people
      .slice(0)
      .map((a) => {
        a.nameComponents = translitSplit(a.name);

        a.gregorianDayOfMemory = gregorianDayOfYear(
          a.gregorianDateOfDeath.month,
          a.gregorianDateOfDeath.date,
        ) - CURRENT_DAY_OF_YEAR;

        if (a.gregorianDayOfMemory < 0) {
          a.gregorianDayOfMemory += DAYS_IN_YEAR;
        }

        a.passedToday = a.gregorianDayOfMemory == 0;

        return a;
      })
      .sort((a, b) => {
        if (a.gregorianDayOfMemory < b.gregorianDayOfMemory) {
          return -1;
        }

        if (a.gregorianDayOfMemory > b.gregorianDayOfMemory) {
          return 1;
        }

        return 0;
      })
      .map(setDates);

    this.state = {
      hebrewDate,
      gregorianDate: new Date(),
      dailyCite,
      allPeople,
      mode: 'main', // 'main' or 'slideshow'
      slideshowTrigger: 0 // to force re-render/logic
    };

    this.searchState(this.state, '');

    this.previousPage = this.previousPage.bind(this);
    this.nextPage = this.nextPage.bind(this);
    this.search = this.search.bind(this);
    this.clearSearch = this.clearSearch.bind(this);
    this.finishSlideshow = this.finishSlideshow.bind(this);
  }

  componentDidMount() {
    this.startMainTimer();
  }

  startMainTimer() {
    if (data.slideshow && data.slideshow.enabled && data.slideshow.images && data.slideshow.images.length > 0) {
      const duration = (data.slideshow.mainDuration || 30) * 1000;
      this.mainTimer = setTimeout(() => {
        this.setState({ mode: 'slideshow' });
      }, duration);
    }
  }

  finishSlideshow() {
    this.setState({ mode: 'main' });
    this.startMainTimer();
  }

  searchState(state, string) {
    const people = this.searchPeopleByString(string);

    const hasKadishToday =
      people.length == 1
      || people.filter((a) => a.passedToday).length == 1;

    const totalNonKadishItems = hasKadishToday
      ? people.length - 1
      : people.length;

    const itemsPerPage = hasKadishToday ? 12 : 16;

    state.people = people;
    state.hasKadishToday = hasKadishToday;
    state.totalPages = Math.ceil(totalNonKadishItems / itemsPerPage);
    state.itemsPerPage = itemsPerPage;
    state.page = 0;
    state.pageShift = 0;
    state.filterString = string;
  }

  searchPeopleByString(string) {
    const searchComponents = translitSplit(string);

    if (searchComponents.length == 0) {
      return this.state.allPeople;
    }

    const result = [];
    let hasFullMatches = false;

    for (let index = 0; index < this.state.allPeople.length; index++) {
      const person = this.state.allPeople[index];

      let matches = 0;

      for (
        let searchComponentIndex = 0;
        searchComponentIndex < searchComponents.length;
        searchComponentIndex++
      ) {
        const searchComponent = searchComponents[searchComponentIndex];

        const found = person
          .nameComponents
          .some(nameComponent => nameComponent.includes(searchComponent));

        if (found) {
          matches += 1;
        }
      }

      if (matches === 0) {
        continue;
      }

      hasFullMatches = hasFullMatches || matches === searchComponents.length;

      result.push({
        matches: matches / searchComponents.length,
        person,
      });
    }

    if (hasFullMatches) {
      return result
        .filter(a => a.matches === 1.0)
        .map(a => a.person);
    } else {
      return result
        .sort((a, b) => {
          if (a.matches < b.matches) {
            return -1;
          }

          if (a.matches > b.matches) {
            return 1;
          }

          return 0;
        })
        .map(a => a.person);
    }
  }

  changePage(shift) {
    this.setState(state => {
      state.page = Math.min(Math.max(state.page + shift, 0), state.totalPages - 1);
      state.pageShift = state.page * state.itemsPerPage;

      return state;
    });
  }

  previousPage() {
    this.changePage(-1);
  }

  nextPage() {
    this.changePage(1);
  }

  search(event) {
    const string = event.target.value;

    this.setState(state => {
      this.searchState(state, string);

      return state;
    });
  }

  clearSearch() {
    this.setState(state => {
      this.searchState(state, '');

      return state;
    });
  }

  getChapterOrHoliday(hebrewDate) {
    let name = hebrewDate.getParsha()[0];

    switch (name) {
      case 'Rosh Hashana':
        return [null, 'Рош ха-Шана'];

      case 'Yom Kippur':
        return [null, 'Йом Кипур'];

      case 'Sukkot':
        return [null, 'Суккот'];

      case 'Chol hamoed Sukkot':
        return [null, 'Холь ха-Моэд Суккот'];

      case 'Shmini Atzeret':
        return [null, 'Шмини Ацерет'];

      case 'End-of-Year: Simchat-Torah, Sukkot':
        return [null, 'Симхат Тора'];

      case 'Pesach':
        return [null, 'Песах'];

      case 'Chol hamoed Pesach':
        return [null, 'Холь ха-Моэд Песах'];

      case 'Second days of Pesach':
        return [null, 'Второй день Песаха'];

      case 'Shavuot':
        return [null, 'Шавуот'];

      default:
        return [name, null];
    }
  }

  getWeeklyChapter(hebrewDate) {
    return this.getChapterOrHoliday(hebrewDate)[0]
  }

  getHoliday(hebrewDate) {
    return this.getChapterOrHoliday(hebrewDate)[1]
  }

  render() {
    if (this.state.mode === 'slideshow') {
      return <Slideshow
        images={data.slideshow.images}
        interval={data.slideshow.interval}
        onFinish={this.finishSlideshow}
      />;
    }

    return <div className="main-container">
      <div className="left">
        <div className="wooden-panel">
          <img className="banner" src={`/images/${data.theme.logo || 'banner-transparent.png'}`} />
          {
            this.state.dailyCite && <div
              className="daily-cite"
              dangerouslySetInnerHTML={{ __html: this.state.dailyCite.text }}
            ></div>
          }
          <div className="nearest-dates">
            <h2>{this.props.t('nearest_dates')}</h2>
            <ul>
              {
                this.state.allPeople.slice(0, 8).map((card, index) => {
                  return <li key={index}><a href={`${data.baseUrl}/card/${card.id}`}>
                    <time>{formatGregorianDate(card.gregorianDateOfDeath)} / {formatHebrewDate(card.hebrewDateOfDeath)}</time>
                    <span className="name">{card.name}</span>
                  </a></li>
                })
              }
            </ul>
          </div>
        </div>
      </div>
      <div className="middle">
        <div className="wooden-panel">
          <header><h1>{data.title}</h1></header>
          {
            this.state.hasKadishToday && <table>
              <tbody>
                <tr style={this.state.people.length == 1 ? { 'height': '100px' } : {}}>
                  <td><Card entry={this.state.people[this.state.pageShift + 1]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 2]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 3]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 4]} /></td>
                </tr>
                <tr>
                  <td><Card entry={this.state.people[this.state.pageShift + 12]} /></td>
                  <td colSpan="2" rowSpan="2">
                    <Card entry={this.state.people[0]} big={true} />
                  </td>
                  <td><Card entry={this.state.people[this.state.pageShift + 5]} /></td>
                </tr>
                <tr>
                  <td><Card entry={this.state.people[this.state.pageShift + 11]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 6]} /></td>
                </tr>
                <tr>
                  <td><Card entry={this.state.people[this.state.pageShift + 10]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 9]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 8]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 7]} /></td>
                </tr>
              </tbody>
            </table>
          }
          {
            !this.state.hasKadishToday && <table>
              <tbody>
                <tr>
                  <td><Card entry={this.state.people[this.state.pageShift + 0]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 1]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 2]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 3]} /></td>
                </tr>
                <tr>
                  <td><Card entry={this.state.people[this.state.pageShift + 4]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 5]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 6]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 7]} /></td>
                </tr>
                <tr>
                  <td><Card entry={this.state.people[this.state.pageShift + 8]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 9]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 10]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 11]} /></td>
                </tr>
                <tr>
                  <td><Card entry={this.state.people[this.state.pageShift + 12]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 13]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 14]} /></td>
                  <td><Card entry={this.state.people[this.state.pageShift + 15]} /></td>
                </tr>
              </tbody>
            </table>
          }
          <div className={`search ${this.state.totalPages <= 1 ? 'search-full-width' : ''}`}>
            <button
              onClick={this.clearSearch}
              style={this.state.filterString.length === 0 ? { 'display': 'none' } : {}}
            >&#x2715;</button>
            <input
              type="text"
              placeholder={this.props.t('search_placeholder')}
              value={this.state.filterString}
              onChange={this.search}
            />
          </div>
          <div
            className="pager"
            style={this.state.totalPages <= 1 ? { 'display': 'none' } : {}}>
            <button onClick={this.previousPage}>&larr;</button>
            <div className="currentPage">
              {this.state.page + 1} / {this.state.totalPages}
            </div>
            <button onClick={this.nextPage}>&rarr;</button>
          </div>
        </div>
      </div>
      <div className="right">
        <div className="wooden-panel">
          <div className="inner">
            <time>
              <h1>{<Clock format={'HH:mm'} ticking={true} timezone={'Asia/Novosibirsk'} />}</h1>
              <br />
              <h2>{formatHebrewDate(this.state.hebrewDate)}</h2>
              <h3>{formatGregorianDate(this.state.gregorianDate)}</h3>
            </time>
            {data.weeklyChapterEnabled && <div>
              {
                this.getWeeklyChapter(this.state.hebrewDate) && <div className="weekly-chapter">
                  <h1>{this.getWeeklyChapter(this.state.hebrewDate)}</h1>
                  <h3>{this.props.t('weekly_chapter')}</h3>
                </div>
              }
              {
                this.getHoliday(this.state.hebrewDate) && <div className="weekly-chapter">
                  <h1>{this.getHoliday(this.state.hebrewDate)}</h1>
                </div>
              }
            </div>}
            <div className={`izkor ${!data.weeklyChapterEnabled ? 'izkor-big' : ''}`}>
              <h2>{this.props.t('memorial_prayer')}</h2>
              <h1>{this.props.t('izkor')}</h1>
              <div>
                {this.props.t('izkor_text')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
  }
}

const HomePage = withTranslation()(HomePageBase);

ReactDOM.render(
  <HomePage />,
  document.getElementById('main-entry'),
);
