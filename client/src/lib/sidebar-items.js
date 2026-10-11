import { personIsListedAsDated } from '../../../lib/death-date';

/** How many sidebar announcements between each community event repeat. */
export const SIDEBAR_EVENT_INTERVAL = 3;

export function prepareSidebarPeople(people) {
  const dated = [];
  const undated = [];

  (people || []).forEach((person) => {
    if (!person) {
      return;
    }

    if (!personIsListedAsDated(person)) {
      undated.push({
        ...person,
        hasDeathDate: false,
        passedToday: false,
        gregorianDateOfDeath: null,
        hebrewDateOfDeath: null,
      });
      return;
    }

    dated.push(person);
  });

  undated.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
  return dated.concat(undated);
}

/**
 * Build the scrolling sidebar list: people sorted by upcoming yahrzeit,
 * with community events repeated every N names (not only once in the list).
 */
export function buildSidebarScrollItems(people, events, interval = SIDEBAR_EVENT_INTERVAL) {
  if (!people.length) {
    return events.length ? events.map((event, index) => cloneEventForList(event, `only-${index}`)) : [];
  }

  if (!events.length) {
    return people;
  }

  const safeInterval = Math.max(1, interval);
  const result = [];
  let eventCycle = 0;

  people.forEach((person, index) => {
    result.push(person);

    if ((index + 1) % safeInterval !== 0) {
      return;
    }

    events.forEach((event, eventIndex) => {
      result.push(cloneEventForList(event, `${index}-${eventIndex}-${eventCycle}`));
    });
    eventCycle += 1;
  });

  return result;
}

function cloneEventForList(event, suffix) {
  return {
    ...event,
    id: `${event.id}-rep-${suffix}`,
    listType: 'event',
  };
}

export function buildSidebarItems(allPeople, communityEvents, boardFeatures = {}) {
  const people = boardFeatures.sidebarNames !== false ? prepareSidebarPeople(allPeople) : [];
  const events = boardFeatures.communityEvents !== false ? communityEvents : [];

  if (!people.length && !events.length) {
    return [];
  }

  if (people.length && events.length) {
    return buildSidebarScrollItems(people, events);
  }

  if (people.length) {
    return people;
  }

  return events.map((event, index) => cloneEventForList(event, `events-${index}`));
}
