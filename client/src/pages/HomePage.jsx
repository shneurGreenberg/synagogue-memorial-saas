import Hebcal from 'hebcal';
import React from 'react';
import { LiveClock } from '../components/LiveClock';
import { ShabbatTimes } from '../components/ShabbatTimes';
import { withTranslation } from 'react-i18next';
import {
  formatHebrewDate,
  formatGregorianDate,
  DAYS_IN_YEAR,
  gregorianDayOfYear,
  getCurrentDayOfYear,
} from '../lib/novosibirsk';
import {
  getGregorianDateInTimezone,
  getHebrewDateInTimezone,
} from '../lib/board-calendar';
import { resolveBoardTimezone } from '../lib/timezone';
import {
  applySearchToPaginationState,
  attachNameComponents,
  getPageShift,
} from '../lib/name-search';
import { sanitizeRichText } from '../lib/html-sanitize';
import { getBoardData } from '../lib/board-data';
import { MemorialCard } from '../components/MemorialCard';
import { assetUrl } from '../lib/asset-url';
import { MemorialPrayersPanel } from '../components/MemorialPrayersPanel';
import { CommunityLogo } from '../components/CommunityLogo';
import { useBoardNavigation } from '../context/BoardNavigationContext';
import { useBoardData } from '../context/BoardDataContext';
import { resolveBoardTitle } from '../lib/board-title';
import { getSidebarCommunityEvents, hasEventDate } from '../lib/community-events';
import { resolveBoardFeatures } from '../lib/board-features';
import { JewishContentPanels } from '../components/JewishContentPanels';
import { SidebarUpcomingPanel } from '../components/SidebarUpcomingPanel';
import { BoardWeatherSection } from '../components/BoardWeatherSection';
import { isPersonYahrzeitToday } from '../lib/yahrzeit-today';
import { TorahReadingOverlay } from '../components/TorahReadingOverlay';

function getDailyCite(appData, hebrewDate) {
  const currentHebrewMonth = hebrewDate.getMonth();
  const currentHebrewDate = hebrewDate.getDate();

  return appData.dailyCites && appData.dailyCites.find((entry) => (
    entry.hebrewDate.month == currentHebrewMonth
    && entry.hebrewDate.date == currentHebrewDate
  ));
}

function setPersonDates(card) {
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

function buildPeopleList(appData, referenceDate = new Date(), timezone = resolveBoardTimezone(appData)) {
  const currentDayOfYear = getCurrentDayOfYear(referenceDate);

  return (appData.people || [])
    .slice(0)
    .map((a) => {
      const person = attachNameComponents({ ...a });
      person.gregorianDayOfMemory = gregorianDayOfYear(
        person.gregorianDateOfDeath.month,
        person.gregorianDateOfDeath.date,
      ) - currentDayOfYear;

      if (person.gregorianDayOfMemory < 0) {
        person.gregorianDayOfMemory += DAYS_IN_YEAR;
      }

      person.passedToday = isPersonYahrzeitToday(person, timezone, referenceDate);

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
    .map(setPersonDates);
}

function buildCalendarState(appData, timezone = resolveBoardTimezone(appData)) {
  const gregorianDate = getGregorianDateInTimezone(timezone);
  const hebrewDate = getHebrewDateInTimezone(timezone);
  const allPeople = buildPeopleList(appData, gregorianDate, timezone);
  const dailyCite = getDailyCite(appData, hebrewDate);

  return {
    hebrewDate,
    gregorianDate,
    dailyCite,
    allPeople,
  };
}


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

function toEventDatetimeAttr(eventDate) {
  if (!eventDate || !eventDate.month || !eventDate.date) {
    return undefined;
  }

  const year = eventDate.year || new Date().getFullYear();
  const month = String(eventDate.month).padStart(2, '0');
  const day = String(eventDate.date).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function prepareCommunityEvents(events) {
  return getSidebarCommunityEvents(events).map((event) => {
    if (!hasEventDate(event)) {
      return {
        ...event,
        listType: 'event',
        id: `event-${event._id}`,
        isUndated: true,
        hasEventDate: false,
        gregorianDate: null,
        hebrewDate: null,
        eventDate: null,
      };
    }

    const month = event.eventDate.month;
    const day = event.eventDate.date;
    const year = event.eventDate.year || new Date().getFullYear();
    const gregorianDate = new Date(year, month - 1, day);

    return {
      ...event,
      listType: 'event',
      id: `event-${event._id}`,
      isUndated: false,
      hasEventDate: true,
      gregorianDate,
      hebrewDate: new Hebcal.HDate(gregorianDate),
      eventDate: { month, date: day, year },
    };
  });
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
          src={assetUrl(`images/${slide.url}`)}
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
    const calendarState = buildCalendarState(appData);
    const communityEvents = prepareCommunityEvents(appData.communityEvents);

    const initialState = {
      ...calendarState,
      communityEvents,
      mode: 'main',
      people: [],
      hasKadishToday: false,
      totalPages: 1,
      itemsPerPage: 16,
      page: 0,
      pageShift: 0,
      filterString: '',
      namesReadingOpen: false,
    };

    applySearchToPaginationState(initialState, '');

    this.state = {
      ...initialState,
    };

    this.previousPage = this.previousPage.bind(this);
    this.nextPage = this.nextPage.bind(this);
    this.search = this.search.bind(this);
    this.clearSearch = this.clearSearch.bind(this);
    this.finishSlideshow = this.finishSlideshow.bind(this);
    this.refreshCalendarState = this.refreshCalendarState.bind(this);
    this.toggleNamesReading = this.toggleNamesReading.bind(this);
    this.closeNamesReading = this.closeNamesReading.bind(this);
  }

  toggleNamesReading() {
    this.setState((state) => ({ namesReadingOpen: !state.namesReadingOpen }));
  }

  closeNamesReading() {
    this.setState({ namesReadingOpen: false });
  }

  getTodayNames() {
    return (this.state.allPeople || [])
      .filter((person) => person.passedToday)
      .map((person) => person.name)
      .filter(Boolean);
  }

  refreshCalendarState() {
    const appData = getAppData();
    const calendarState = buildCalendarState(appData);

    this.setState((state) => {
      const next = {
        ...state,
        ...calendarState,
      };
      applySearchToPaginationState(next, state.filterString);
      return next;
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.calendarDayKey !== this.props.calendarDayKey) {
      this.refreshCalendarState();
    }
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

  changePage(shift) {
    this.setState((state) => {
      const page = Math.min(Math.max(state.page + shift, 0), state.totalPages - 1);
      return {
        page,
        pageShift: getPageShift({ ...state, page }),
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
      applySearchToPaginationState(next, string);
      return next;
    });
  }

  clearSearch() {
    this.setState((state) => {
      const next = { ...state };
      applySearchToPaginationState(next, '');
      return next;
    });
  }

  renderKadishGridContent(pageShift) {
    const { people } = this.state;
    const pick = (index) => people[pageShift + index];
    const wrap = (className, entry, big) => (
      <div key={className} className={className}>
        <MemorialCard entry={entry} big={big} onOpen={this.props.onOpenCard} />
      </div>
    );

    return (
      <>
        {wrap('k-r1c1', pick(1))}
        {wrap('k-r1c2', pick(2))}
        {wrap('k-r1c3', pick(3))}
        {wrap('k-r1c4', pick(4))}
        {wrap('k-r2c1', pick(12))}
        <div className="kadish-center">
          <MemorialCard entry={pick(0)} big onOpen={this.props.onOpenCard} />
        </div>
        {wrap('k-r2c4', pick(5))}
        {wrap('k-r3c1', pick(11))}
        {wrap('k-r3c4', pick(6))}
        {wrap('k-r4c1', pick(10))}
        {wrap('k-r4c2', pick(9))}
        {wrap('k-r4c3', pick(8))}
        {wrap('k-r4c4', pick(7))}
      </>
    );
  }

  renderStandardPageGrid(pageIndex) {
    const { people, page } = this.state;
    const pageShift = getPageShift({ ...this.state, page: pageIndex });
    const isHidden = pageIndex !== page;

    return (
      <div
        key={`page-${pageIndex}`}
        className={`cards-grid${isHidden ? ' cards-grid-hidden' : ''}`}
        aria-hidden={isHidden}
      >
        {Array.from({ length: 16 }, (_, i) => {
          const entry = people[pageShift + i];
          return (
            <MemorialCard
              key={entry ? `person-${entry.id}` : `empty-${pageIndex}-${i}`}
              entry={entry}
              onOpen={this.props.onOpenCard}
            />
          );
        })}
      </div>
    );
  }

  renderAllGrids() {
    const { page, totalPages, hasKadishToday } = this.state;
    const grids = [];

    if (hasKadishToday) {
      const isHidden = page !== 0;
      grids.push(
        <div
          key="kadish-page"
          className={`cards-grid cards-grid-kadish${isHidden ? ' cards-grid-hidden' : ''}`}
          aria-hidden={isHidden}
        >
          {this.renderKadishGridContent(getPageShift({ ...this.state, page: 0 }))}
        </div>,
      );
    }

    const firstStandardPage = hasKadishToday ? 1 : 0;
    for (let pageIndex = firstStandardPage; pageIndex < totalPages; pageIndex += 1) {
      grids.push(this.renderStandardPageGrid(pageIndex));
    }

    return <div className="cards-area">{grids}</div>;
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

    const boardFeatures = resolveBoardFeatures(appData.boardFeatures);
    const showMemorialPrayers = boardFeatures.kelMaleRachamim || boardFeatures.izkor;

    const todayNames = this.getTodayNames();

    return (
      <main className="main-container">
        {this.state.namesReadingOpen && (
          <TorahReadingOverlay
            names={todayNames}
            onClose={this.closeNamesReading}
          />
        )}
        <aside className="left side-panel">
          <div className="wooden-panel">
            <div className="banner-wrap">
              <CommunityLogo src={assetUrl(`images/${logo}`)} alt={appData.title || 'Synagogue'} />
            </div>
            {this.state.dailyCite && (
              <div
                className="daily-cite"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(this.state.dailyCite.text) }}
              />
            )}
            <JewishContentPanels uiLang={this.props.uiLang} />
            <SidebarUpcomingPanel
              uiLang={this.props.uiLang}
              communityEvents={this.state.communityEvents}
              formatGregorianDate={formatGregorianDate}
              formatHebrewDate={formatHebrewDate}
              showTopDivider={!boardFeatures.hayomYom}
            />
          </div>
        </aside>
        <section className="middle">
          <div className="wooden-panel">
            <header className="board-header">
              <button type="button" className="board-header-button" onClick={this.toggleNamesReading} aria-label={this.props.t('torah_reading_names')}>
                <h1>{this.props.boardTitle}</h1>
              </button>
            </header>
            {this.renderAllGrids()}
            <div className={`board-footer${this.state.totalPages <= 1 ? ' board-footer-search-only' : ''}`}>
              <div className="search">
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
                  value={this.state.filterString}
                  onChange={this.search}
                  placeholder={this.props.t('search_placeholder')}
                  aria-label={this.props.t('search_placeholder')}
                />
              </div>
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
          </div>
        </section>
        <aside className="right side-panel">
          <div className="wooden-panel">
            <div className="inner">
              <div className="board-right-header">
                <div className="board-clock-block">
                  <time>
                    <h1><LiveClock timezone={(appData.location && appData.location.timezone) || 'Asia/Novosibirsk'} /></h1>
                    <h2>{formatHebrewDate(this.state.hebrewDate)}</h2>
                    <h3>{formatGregorianDate(this.state.gregorianDate)}</h3>
                  </time>
                </div>
                {appData.shabbatTimesEnabled && (
                  <div className="board-shabbat-block">
                    <ShabbatTimes />
                  </div>
                )}
                {(boardFeatures.weather || boardFeatures.sunriseSunset) && (
                  <BoardWeatherSection
                    showWeather={boardFeatures.weather}
                    showSunTimes={boardFeatures.sunriseSunset}
                  />
                )}
              </div>
              {showMemorialPrayers && (
                <MemorialPrayersPanel
                  big={!appData.shabbatTimesEnabled}
                  showKelMale={boardFeatures.kelMaleRachamim}
                  showIzkor={boardFeatures.izkor}
                  memorialPrayerLabel={this.props.t('memorial_prayer')}
                  kelMaleHeading={this.props.t('kel_male_rachamim')}
                  kelMaleText={this.props.t('kel_male_rachamim_text')}
                  izkorHeading={this.props.t('izkor')}
                  izkorText={this.props.t('izkor_text')}
                />
              )}
            </div>
          </div>
        </aside>
      </main>
    );
  }
}

function HomePageConnected(props) {
  const { goToCard } = useBoardNavigation();
  const { revision, calendarDayKey, uiLang, data } = useBoardData();
  const boardTitle = resolveBoardTitle(data, uiLang);
  return (
    <HomePageBase
      key={`home-${revision}-${uiLang}-${calendarDayKey}`}
      {...props}
      onOpenCard={goToCard}
      uiLang={uiLang}
      calendarDayKey={calendarDayKey}
      boardTitle={boardTitle}
    />
  );
}

export default withTranslation()(HomePageConnected);
