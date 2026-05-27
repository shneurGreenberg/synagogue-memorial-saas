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
const { sanitizeRichText } = require('./html-sanitize');
const { PersonAvatar } = require('./person-ui');

configureNovosibirsk();

const CANDLE_LOOP_LENGTH = 104;

function getAppData() {
  return window.data || {};
}

function toDatetimeAttr(gregorianDateOfDeath) {
  if (!gregorianDateOfDeath || !gregorianDateOfDeath.year) {
    return undefined;
  }

  const month = String(gregorianDateOfDeath.month).padStart(2, '0');
  const day = String(gregorianDateOfDeath.date).padStart(2, '0');

  return `${gregorianDateOfDeath.year}-${month}-${day}`;
}

class CardBase extends React.Component {
  constructor(props) {
    super(props);
    this.onActivate = this.onActivate.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
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
    this.setState((prev) => {
      if (prev.candleTimeout) {
        clearTimeout(prev.candleTimeout);
      }

      return {
        candleHash: Math.random(),
        candleTimeout: setTimeout(() => {
          this.setCandleTimeout(CANDLE_LOOP_LENGTH);
        }, left * 1000),
      };
    });
  }

  tearDownCandle() {
    if (this.state.candleTimeout) {
      clearTimeout(this.state.candleTimeout);
      this.setState({ candleTimeout: null });
    }
  }

  onActivate() {
    if (!this.props.entry) {
      return;
    }

    window.location.href = `${getAppData().baseUrl}/card/${this.props.entry.id}`;
  }

  onKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onActivate();
    }
  }

  render() {
    const { entry, big } = this.props;

    if (!entry) {
      return <div className="card card-hidden" aria-hidden="true" />;
    }

    const showCandle = !entry.photo;

    return (
      <article
        className={`
          card
          golden-panel
          ${big ? 'card-big' : ''}
          ${entry.passedToday ? 'passed-today' : ''}
          ${entry.passedToday && !big ? 'card-outline' : ''}
        `}
        role="button"
        tabIndex={0}
        onClick={this.onActivate}
        onKeyDown={this.onKeyDown}
        aria-label={`${entry.name}, ${this.props.t('learn_more')}`}
      >
        <div className="card-media">
          <PersonAvatar person={entry} size={big ? 'lg' : 'md'} />
          {showCandle && (
            <div
              className="candle"
              style={{ backgroundImage: `url("/images/candle.webp?hash=${this.state.candleHash}")` }}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="inner">
          <h3>{entry.name}</h3>
          <time dateTime={toDatetimeAttr(entry.gregorianDateOfDeath)}>
            {formatGregorianDate(entry.gregorianDateOfDeath)}
          </time>
          <br />
          <time>{formatHebrewDate(entry.hebrewDateOfDeath)}</time>
          {entry.title && big && <div className="title">{entry.title}</div>}
          <div className="placeholder" />
        </div>
        <span className="card-action">{this.props.t('learn_more')}</span>
      </article>
    );
  }
}

const Card = withTranslation()(CardBase);

class Slideshow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentIndex: 0,
      loaded: false,
    };
    this.skip = this.skip.bind(this);
    this.onImageLoad = this.onImageLoad.bind(this);
  }

  componentDidMount() {
    this.startTimer();
  }

  componentWillUnmount() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
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
      this.setState({ currentIndex: nextIndex, loaded: false });
      this.startTimer();
    }
  }

  skip() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.props.onFinish();
  }

  onImageLoad() {
    this.setState({ loaded: true });
  }

  render() {
    const slide = this.props.images[this.state.currentIndex];
    if (!slide) {
      return null;
    }

    return (
      <div className="slideshow-overlay" role="dialog" aria-label="Slideshow">
        {!this.state.loaded && <div className="slideshow-loading">{this.props.t('slideshow_loading')}</div>}
        <img
          src={`/images/${slide.url}`}
          alt={slide.text || 'Slideshow'}
          onLoad={this.onImageLoad}
          className="slideshow-image"
        />
        {slide.text && (
          <div className="slideshow-caption">{slide.text}</div>
        )}
        <button type="button" className="slideshow-skip" onClick={this.skip}>
          {this.props.t('slideshow_skip')}
        </button>
      </div>
    );
  }
}

const SlideshowTranslated = withTranslation()(Slideshow);

class HomePageBase extends React.Component {
  constructor() {
    super();

    const appData = getAppData();
    const hebrewDate = new Hebcal.HDate();
    const currentHebrewMonth = hebrewDate.getMonth();
    const currentHebrewDate = hebrewDate.getDate();

    const dailyCite = appData.dailyCites && appData.dailyCites.find((entry) => (
      entry.hebrewDate.month == currentHebrewMonth
      && entry.hebrewDate.date == currentHebrewDate
    ));

    function setDates(card) {
      if (!card.gregorianDateOfDeath.year) {
        return card;
      }

      const gregorianDateOfDeath = new Date(
        card.gregorianDateOfDeath.year,
        card.gregorianDateOfDeath.month - 1,
        card.gregorianDateOfDeath.date,
      );

      return {
        ...card,
        gregorianDateOfDeath,
        hebrewDateOfDeath: new Hebcal.HDate(gregorianDateOfDeath),
      };
    }

    const allPeople = (appData.people || [])
      .slice(0)
      .map((a) => {
        const person = { ...a };
        person.nameComponents = translitSplit(person.name);
        person.gregorianDayOfMemory = gregorianDayOfYear(
          person.gregorianDateOfDeath.month,
          person.gregorianDateOfDeath.date,
        ) - CURRENT_DAY_OF_YEAR;

        if (person.gregorianDayOfMemory < 0) {
          person.gregorianDayOfMemory += DAYS_IN_YEAR;
        }

        person.passedToday = person.gregorianDayOfMemory == 0;

        return person;
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

    const initialState = {
      hebrewDate,
      gregorianDate: new Date(),
      dailyCite,
      allPeople,
      mode: 'main',
      people: [],
      hasKadishToday: false,
      totalPages: 1,
      itemsPerPage: 16,
      page: 0,
      pageShift: 0,
      filterString: '',
    };

    this.searchState(initialState, '');

    this.state = initialState;

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
    const appData = getAppData();

    if (appData.slideshow && appData.slideshow.enabled && appData.slideshow.images && appData.slideshow.images.length > 0) {
      const duration = (appData.slideshow.mainDuration || 30) * 1000;
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
    const people = this.searchPeopleByString(string, state.allPeople);

    const hasKadishToday =
      people.length == 1
      || people.filter((a) => a.passedToday).length == 1;

    const totalNonKadishItems = hasKadishToday
      ? people.length - 1
      : people.length;

    const itemsPerPage = hasKadishToday ? 12 : 16;

    state.people = people;
    state.hasKadishToday = hasKadishToday;
    state.totalPages = Math.max(1, Math.ceil(totalNonKadishItems / itemsPerPage));
    state.itemsPerPage = itemsPerPage;
    state.page = 0;
    state.pageShift = 0;
    state.filterString = string;
  }

  searchPeopleByString(string, allPeople) {
    const searchComponents = translitSplit(string);

    if (searchComponents.length == 0) {
      return allPeople;
    }

    const result = [];
    let hasFullMatches = false;

    for (let index = 0; index < allPeople.length; index++) {
      const person = allPeople[index];
      let matches = 0;

      for (
        let searchComponentIndex = 0;
        searchComponentIndex < searchComponents.length;
        searchComponentIndex++
      ) {
        const searchComponent = searchComponents[searchComponentIndex];
        const found = person
          .nameComponents
          .some((nameComponent) => nameComponent.includes(searchComponent));

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
        .filter((a) => a.matches === 1.0)
        .map((a) => a.person);
    }

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
      .map((a) => a.person);
  }

  changePage(shift) {
    this.setState((state) => {
      const page = Math.min(Math.max(state.page + shift, 0), state.totalPages - 1);
      return {
        page,
        pageShift: page * state.itemsPerPage,
      };
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

    this.setState((state) => {
      const next = { ...state };
      this.searchState(next, string);
      return next;
    });
  }

  clearSearch() {
    this.setState((state) => {
      const next = { ...state };
      this.searchState(next, '');
      return next;
    });
  }

  getChapterOrHoliday(hebrewDate) {
    const name = hebrewDate.getParsha()[0];

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
      case 'End-of-year: Simchat-Torah, Sukkot':
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
    return this.getChapterOrHoliday(hebrewDate)[0];
  }

  getHoliday(hebrewDate) {
    return this.getChapterOrHoliday(hebrewDate)[1];
  }

  renderStandardGrid() {
    const cells = [];

    for (let i = 0; i < 16; i += 1) {
      const entry = this.state.people[this.state.pageShift + i];
      cells.push(
        <Card key={entry ? `person-${entry.id}` : `empty-${i}`} entry={entry} />
      );
    }

    return <div className="cards-grid">{cells}</div>;
  }

  renderKadishGrid() {
    const { people, pageShift } = this.state;
    const pick = (index) => people[index];
    const wrap = (className, entry, big) => (
      <div key={className} className={className}>
        <Card entry={entry} big={big} />
      </div>
    );

    return (
      <div className="cards-grid cards-grid-kadish">
        {wrap('k-r1c1', pick(pageShift + 1))}
        {wrap('k-r1c2', pick(pageShift + 2))}
        {wrap('k-r1c3', pick(pageShift + 3))}
        {wrap('k-r1c4', pick(pageShift + 4))}
        {wrap('k-r2c1', pick(pageShift + 12))}
        <div className="kadish-center">
          <Card entry={pick(0)} big />
        </div>
        {wrap('k-r2c4', pick(pageShift + 5))}
        {wrap('k-r3c1', pick(pageShift + 11))}
        {wrap('k-r3c4', pick(pageShift + 6))}
        {wrap('k-r4c1', pick(pageShift + 10))}
        {wrap('k-r4c2', pick(pageShift + 9))}
        {wrap('k-r4c3', pick(pageShift + 8))}
        {wrap('k-r4c4', pick(pageShift + 7))}
      </div>
    );
  }

  render() {
    const appData = getAppData();

    if (this.state.mode === 'slideshow') {
      return (
        <SlideshowTranslated
          images={appData.slideshow.images}
          interval={appData.slideshow.interval}
          onFinish={this.finishSlideshow}
        />
      );
    }

    const logo = (appData.theme && appData.theme.logo) || 'banner-transparent.png';

    return (
      <main className="main-container">
        <aside className="left">
          <div className="wooden-panel">
            <img className="banner" src={`/images/${logo}`} alt={appData.title || 'Synagogue'} />
            {this.state.dailyCite && (
              <div
                className="daily-cite"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(this.state.dailyCite.text) }}
              />
            )}
            <nav className="nearest-dates" aria-label={this.props.t('nearest_dates')}>
              <h2>{this.props.t('nearest_dates')}</h2>
              <ul>
                {this.state.allPeople.slice(0, 8).map((card) => (
                  <li key={card.id}>
                    <a href={`${appData.baseUrl}/card/${card.id}`}>
                      <PersonAvatar person={card} size="sm" />
                      <div className="nearest-person-meta">
                        <time dateTime={toDatetimeAttr(card.gregorianDateOfDeath)}>
                          {formatGregorianDate(card.gregorianDateOfDeath)} / {formatHebrewDate(card.hebrewDateOfDeath)}
                        </time>
                        <span className="name">{card.name}</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
        <section className="middle">
          <div className="wooden-panel">
            <header><h1>{appData.title}</h1></header>
            {this.state.hasKadishToday ? this.renderKadishGrid() : this.renderStandardGrid()}
            <div className={`search ${this.state.totalPages <= 1 ? 'search-full-width' : ''}`}>
              <button
                type="button"
                className="search-clear"
                onClick={this.clearSearch}
                style={this.state.filterString.length === 0 ? { display: 'none' } : {}}
                aria-label={this.props.t('clear_search')}
              >
                &#x2715;
              </button>
              <input
                type="search"
                placeholder={this.props.t('search_placeholder')}
                value={this.state.filterString}
                onChange={this.search}
                aria-label={this.props.t('search_placeholder')}
              />
            </div>
            <div
              className="pager"
              style={this.state.totalPages <= 1 ? { display: 'none' } : {}}
            >
              <button type="button" onClick={this.previousPage} aria-label={this.props.t('previous_page')}>&larr;</button>
              <div className="currentPage" aria-live="polite">
                {this.state.page + 1} / {this.state.totalPages}
              </div>
              <button type="button" onClick={this.nextPage} aria-label={this.props.t('next_page')}>&rarr;</button>
            </div>
          </div>
        </section>
        <aside className="right">
          <div className="wooden-panel">
            <div className="inner">
              <time>
                <h1><Clock format="HH:mm" ticking timezone="Asia/Novosibirsk" /></h1>
                <br />
                <h2>{formatHebrewDate(this.state.hebrewDate)}</h2>
                <h3>{formatGregorianDate(this.state.gregorianDate)}</h3>
              </time>
              {appData.weeklyChapterEnabled && (
                <div>
                  {this.getWeeklyChapter(this.state.hebrewDate) && (
                    <div className="weekly-chapter">
                      <h1>{this.getWeeklyChapter(this.state.hebrewDate)}</h1>
                      <h3>{this.props.t('weekly_chapter')}</h3>
                    </div>
                  )}
                  {this.getHoliday(this.state.hebrewDate) && (
                    <div className="weekly-chapter">
                      <h1>{this.getHoliday(this.state.hebrewDate)}</h1>
                    </div>
                  )}
                </div>
              )}
              <div className={`izkor ${!appData.weeklyChapterEnabled ? 'izkor-big' : ''}`}>
                <h2>{this.props.t('memorial_prayer')}</h2>
                <h1>{this.props.t('izkor')}</h1>
                <div>{this.props.t('izkor_text')}</div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    );
  }
}

const HomePage = withTranslation()(HomePageBase);

ReactDOM.render(
  <HomePage />,
  document.getElementById('main-entry'),
);
