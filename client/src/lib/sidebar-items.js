/** How many memorial names between each community announcement repeat in the sidebar. */
export const SIDEBAR_EVENT_INTERVAL = 12;

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
  const people = boardFeatures.sidebarNames !== false ? allPeople : [];
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
