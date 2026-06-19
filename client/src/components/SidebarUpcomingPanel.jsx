import React, { useEffect, useMemo, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import { resolveBoardFeatures } from '../lib/board-features';
import { buildSidebarAnnouncements } from '../lib/sidebar-announcements';

const REFRESH_MS = 60 * 60 * 1000;

function formatHolidayDate(dateStr, lang) {
  if (!dateStr) {
    return '';
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (lang === 'he') {
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  }

  if (lang === 'en') {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
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

class ScrollingAnnouncementsList extends React.Component {
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
    if (prevProps.items !== this.props.items) {
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

  renderEvent(card, suffix) {
    return (
      <li key={`${card.id}${suffix}`} className="community-event-item">
        <div className="community-event-link" role="note">
          {card.hasEventDate !== false && card.eventDate && (
            <time dateTime={toEventDatetimeAttr(card.eventDate)}>
              {this.props.formatGregorianDate(card.eventDate)} / {this.props.formatHebrewDate(card.hebrewDate)}
            </time>
          )}
          <span className="community-event-title">{card.title}</span>
          {card.text && (
            <span className="community-event-text">{card.text}</span>
          )}
        </div>
      </li>
    );
  }

  renderHoliday(card, suffix) {
    return (
      <li key={`${card.id}${suffix}`} className="sidebar-holiday-item">
        <div className="sidebar-holiday-link" role="note">
          <time dateTime={card.date}>{formatHolidayDate(card.date, this.props.uiLang)}</time>
          <span className="sidebar-holiday-title">{card.title}</span>
        </div>
      </li>
    );
  }

  renderChabad(card, suffix) {
    return (
      <li key={`${card.id}${suffix}`} className="sidebar-chabad-item">
        <div className="sidebar-chabad-link" role="note">
          <time dateTime={card.date}>{formatHolidayDate(card.date, this.props.uiLang)}</time>
          <span className="sidebar-chabad-title">{card.title}</span>
        </div>
      </li>
    );
  }

  renderItem(card, suffix) {
    if (card.listType === 'holiday') {
      return this.renderHoliday(card, suffix);
    }

    if (card.listType === 'chabad') {
      return this.renderChabad(card, suffix);
    }

    return this.renderEvent(card, suffix);
  }

  render() {
    const { items } = this.props;
    const listItems = items.map((card) => this.renderItem(card, ''));

    return (
      <div className="nearest-dates-scroll" ref={this.viewportRef}>
        <ul
          className={`nearest-dates-track${this.state.shouldScroll ? ' is-scrolling' : ''}`}
          ref={this.trackRef}
          style={this.state.shouldScroll ? { animationDuration: `${this.state.durationSec}s` } : undefined}
        >
          {listItems}
          {this.state.shouldScroll && items.map((card) => this.renderItem(card, '-dup'))}
        </ul>
      </div>
    );
  }
}

function SidebarUpcomingPanelBase({
  t, uiLang, communityEvents, formatGregorianDate, formatHebrewDate, showTopDivider,
}) {
  const appData = getBoardData();
  const boardFeatures = resolveBoardFeatures(appData.boardFeatures);
  const slug = appData.slug;
  const [holidays, setHolidays] = useState([]);
  const [chabadDates, setChabadDates] = useState([]);

  useEffect(() => {
    if (!slug || (!boardFeatures.upcomingHolidays && !boardFeatures.communityEvents)) {
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      if (!boardFeatures.upcomingHolidays) {
        return;
      }

      try {
        const response = await fetch(`/s/${slug}/api/jewish-content?lang=${uiLang}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok || cancelled) {
          return;
        }

        const payload = await response.json();
        if (!cancelled) {
          setHolidays(Array.isArray(payload.upcomingHolidays) ? payload.upcomingHolidays : []);
          setChabadDates(Array.isArray(payload.chabadDates) ? payload.chabadDates : []);
        }
      } catch {
        /* ignore transient network errors */
      }
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [slug, uiLang, boardFeatures.upcomingHolidays, boardFeatures.communityEvents]);

  const items = useMemo(
    () => buildSidebarAnnouncements(communityEvents, holidays, chabadDates, boardFeatures),
    [communityEvents, holidays, chabadDates, boardFeatures],
  );

  if (!items.length) {
    return null;
  }

  return (
    <nav
      className={`nearest-dates${showTopDivider ? ' nearest-dates--divider-top' : ''}`}
      aria-label={t('sidebar_upcoming_title')}
    >
      <h2>{t('sidebar_upcoming_title')}</h2>
      <ScrollingAnnouncementsList
        items={items}
        uiLang={uiLang}
        formatGregorianDate={formatGregorianDate}
        formatHebrewDate={formatHebrewDate}
      />
    </nav>
  );
}

export const SidebarUpcomingPanel = withTranslation()(SidebarUpcomingPanelBase);
