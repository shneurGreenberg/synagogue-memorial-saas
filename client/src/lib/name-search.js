import { translitSplit } from './novosibirsk';
import {
  shouldUseKadishBoardLayout,
  shouldPrioritizeYahrzeitForKadish,
  prioritizeYahrzeitForKadish as reorderYahrzeitForKadish,
  computeKadishPagination,
} from '../../../lib/board-yahrzeit-layout.js';

const WORD_SPLIT = /\s+/;

function tokenizeName(name) {
  const normalized = String(name || '').toLowerCase().trim();
  const tokens = new Set();

  if (!normalized) {
    return [];
  }

  normalized.split(WORD_SPLIT).forEach((word) => {
    if (word) {
      tokens.add(word);
    }
  });

  translitSplit(name).forEach((part) => {
    if (part) {
      tokens.add(part);
    }
  });

  return [...tokens];
}

export function parseSearchComponents(string) {
  const query = String(string || '').trim().toLowerCase();

  if (!query) {
    return [];
  }

  const components = new Set();

  query.split(WORD_SPLIT).forEach((word) => {
    if (word) {
      components.add(word);
    }
  });

  translitSplit(query).forEach((part) => {
    if (part) {
      components.add(part);
    }
  });

  return [...components];
}

export function attachNameComponents(person) {
  return {
    ...person,
    nameComponents: tokenizeName(person.name),
  };
}

export function searchPeopleByString(string, allPeople) {
  const searchComponents = parseSearchComponents(string);

  if (searchComponents.length === 0) {
    return allPeople;
  }

  const result = [];
  let hasFullMatches = false;

  for (let index = 0; index < allPeople.length; index += 1) {
    const person = allPeople[index];
    let matches = 0;

    for (let searchComponentIndex = 0; searchComponentIndex < searchComponents.length; searchComponentIndex += 1) {
      const searchComponent = searchComponents[searchComponentIndex];
      const found = person.nameComponents
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
      .filter((entry) => entry.matches === 1)
      .map((entry) => entry.person);
  }

  return result
    .sort((a, b) => b.matches - a.matches)
    .map((entry) => entry.person);
}

export function prioritizeYahrzeitForKadish(people) {
  return reorderYahrzeitForKadish(people);
}

export function getPageShift(state) {
  const { page, hasKadishToday } = state;

  if (!hasKadishToday) {
    return page * 16;
  }

  if (page === 0) {
    return 0;
  }

  return 12 + ((page - 1) * 16);
}

export function shouldUseKadishLayout(state) {
  return state.hasKadishToday && state.page === 0;
}

export function applySearchToPaginationState(state, string) {
  let people = searchPeopleByString(string, state.allPeople);

  const yahrzeitTodayCount = people.filter((person) => person.passedToday).length;
  const hasKadishToday = shouldUseKadishBoardLayout(people.length, yahrzeitTodayCount);

  if (shouldPrioritizeYahrzeitForKadish(yahrzeitTodayCount, people.length)) {
    people = prioritizeYahrzeitForKadish(people);
  }

  const { itemsPerPage, totalPages } = computeKadishPagination(people.length, hasKadishToday);

  state.people = people;
  state.hasKadishToday = hasKadishToday;
  state.yahrzeitTodayCount = yahrzeitTodayCount;
  state.totalPages = totalPages;
  state.itemsPerPage = itemsPerPage;
  state.page = 0;
  state.pageShift = 0;
  state.filterString = string;
}
