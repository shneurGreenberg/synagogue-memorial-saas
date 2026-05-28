import Hebcal from 'hebcal';
import React from 'react';
import { LiveClock } from '../components/LiveClock';
import { withTranslation } from 'react-i18next';
import {
  formatHebrewDate,
  formatGregorianDate,
  CURRENT_DAY_OF_YEAR,
  DAYS_IN_YEAR,
  gregorianDayOfYear,
} from '../lib/novosibirsk';
import { sanitizeRichText } from '../lib/html-sanitize';
import { getBoardData } from '../lib/board-data';
import { MemorialCard } from '../components/MemorialCard';
import { MemorialPrayersPanel } from '../components/MemorialPrayersPanel';
import { CommunityLogo } from '../components/CommunityLogo';
import { useBoardNavigation } from '../context/BoardNavigationContext';
import { useBoardData } from '../context/BoardDataContext';
import { resolveBoardTitle } from '../lib/board-title';

function getAppData() {
  return getBoardData();
}

function toDatetimeAttr(gregorianDateOfDeath) {
  if (!gregorianDateOfDeath || !gregorianDateOfDeath.year) {
    return undefined;
  }

  const month = String(gregorianDateOfDeath.month).padStart(2, '0');
  const day = String(gregorianDateOfDeath.date).padStart(2, '0');

  return `${gregorianDateOfDeath.year}-${month}-${day}`;
}

class NearestDatesList extends React.Component {
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
    if (prevProps.people !== this.props.people) {
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

      const pixelsPerSecond = 18;
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

  renderPerson(card, suffix) {
    const displayName = card.name || '';
    return (
      <li key={`${card.id}${suffix}`}>
        <button type="button" className="nearest-date-link" onClick={() => this.props.onPersonClick(card.id)}>
          <time dateTime={toDatetimeAttr(card.gregorianDateOfDeath)}>
            {formatGregorianDate(card.gregorianDateOfDeath)} / {formatHebrewDate(card.hebrewDateOfDeath)}
          </time>
          <span className="name">{displayName}</span>
        </button>
      </li>
    );
  }

  render() {
    const { people } = this.props;
    const items = people.map((card) => this.renderPerson(card, ''));

    return (
      <div className="nearest-dates-scroll" ref={this.viewportRef}>
        <ul
          className={`nearest-dates-track${this.state.shouldScroll ? ' is-scrolling' : ''}`}
          ref={this.trackRef}
          style={this.state.shouldScroll ? { animationDuration: `${this.state.durationSec}s` } : undefined}
        >
          {items}
          {this.state.shouldScroll && people.map((card) => this.renderPerson(card, '-dup'))}
        </ul>
      </div>
    );
  }
}

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
    };

    this.initPagination(initialState);

    this.state = {
      ...initialState,
    };

    this.previousPage = this.previousPage.bind(this);
    this.nextPage = this.nextPage.bind(this);
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

  initPagination(state) {
    const people = state.allPeople;

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
        <MemorialCard
          key={entry ? `person-${entry.id}` : `empty-${i}`}
          entry={entry}
          onOpen={this.props.onOpenCard}
        />
      );
    }

    return (
      <div className="cards-area">
        <div className="cards-grid" key={`page-${this.state.page}`}>{cells}</div>
      </div>
    );
  }

  renderKadishGrid() {
    const { people, pageShift } = this.state;
    const pick = (index) => people[index];
    const wrap = (className, entry, big) => (
      <div key={className} className={className}>
        <MemorialCard entry={entry} big={big} onOpen={this.props.onOpenCard} />
      </div>
    );

    return (
      <div className="cards-area">
        <div className="cards-grid cards-grid-kadish" key={`kadish-page-${this.state.page}`}>
        {wrap('k-r1c1', pick(pageShift + 1))}
        {wrap('k-r1c2', pick(pageShift + 2))}
        {wrap('k-r1c3', pick(pageShift + 3))}
        {wrap('k-r1c4', pick(pageShift + 4))}
        {wrap('k-r2c1', pick(pageShift + 12))}
        <div className="kadish-center">
          <MemorialCard entry={pick(0)} big onOpen={this.props.onOpenCard} />
        </div>
        {wrap('k-r2c4', pick(pageShift + 5))}
        {wrap('k-r3c1', pick(pageShift + 11))}
        {wrap('k-r3c4', pick(pageShift + 6))}
        {wrap('k-r4c1', pick(pageShift + 10))}
        {wrap('k-r4c2', pick(pageShift + 9))}
        {wrap('k-r4c3', pick(pageShift + 8))}
        {wrap('k-r4c4', pick(pageShift + 7))}
        </div>
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
        <aside className="left side-panel">
          <div className="wooden-panel">
            <div className="banner-wrap">
              <CommunityLogo src={`/images/${logo}`} alt={appData.title || 'Synagogue'} />
            </div>
            {this.state.dailyCite && (
              <div
                className="daily-cite"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(this.state.dailyCite.text) }}
              />
            )}
            <nav className="nearest-dates" aria-label={this.props.t('nearest_dates')}>
              <h2>{this.props.t('nearest_dates')}</h2>
              <NearestDatesList people={this.state.allPeople} onPersonClick={this.props.onOpenCard} />
            </nav>
          </div>
        </aside>
        <section className="middle">
          <div className="wooden-panel">
            <header className="board-header"><h1>{this.props.boardTitle || appData.title}</h1></header>
            {this.state.hasKadishToday ? this.renderKadishGrid() : this.renderStandardGrid()}
            <div
              className="pager"
              style={this.state.totalPages <= 1 ? { display: 'none' } : {}}
            >
              <button type="button" className="pager-btn pager-btn-prev" onClick={this.previousPage} aria-label={this.props.t('previous_page')}>
                <span className="pager-chevron pager-chevron-up" aria-hidden="true" />
              </button>
              <div className="currentPage" aria-live="polite">
                <span className="pager-page-num">{this.state.page + 1}</span>
                <span className="pager-page-sep">/</span>
                <span className="pager-page-total">{this.state.totalPages}</span>
              </div>
              <button type="button" className="pager-btn pager-btn-next" onClick={this.nextPage} aria-label={this.props.t('next_page')}>
                <span className="pager-chevron pager-chevron-down" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
        <aside className="right side-panel">
          <div className="wooden-panel">
            <div className="inner">
              <time>
                <h1><LiveClock timezone="Asia/Novosibirsk" /></h1>
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
              <MemorialPrayersPanel
                big={!appData.weeklyChapterEnabled}
                memorialPrayerLabel={this.props.t('memorial_prayer')}
                kelMaleHeading={this.props.t('kel_male_rachamim')}
                kelMaleText={this.props.t('kel_male_rachamim_text')}
                izkorHeading={this.props.t('izkor')}
                izkorText={this.props.t('izkor_text')}
              />
            </div>
          </div>
        </aside>
      </main>
    );
  }
}

function HomePageConnected(props) {
  const { goToCard } = useBoardNavigation();
  const { revision, uiLang, data } = useBoardData();
  const boardTitle = resolveBoardTitle(data, uiLang);
  return (
    <HomePageBase
      key={`home-${revision}`}
      {...props}
      onOpenCard={goToCard}
      uiLang={uiLang}
      boardTitle={boardTitle}
    />
  );
}

export default withTranslation()(HomePageConnected);
