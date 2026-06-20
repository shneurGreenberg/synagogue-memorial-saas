import { translitSplit } from './novosibirsk';

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
  const people = searchPeopleByString(string, state.allPeople);

  const hasKadishToday =
    people.length === 1
    || people.filter((person) => person.passedToday).length === 1;

  let totalPages = 1;
  if (hasKadishToday) {
    if (people.length > 12) {
      totalPages = 1 + Math.ceil((people.length - 12) / 16);
    }
  } else {
    totalPages = Math.max(1, Math.ceil(people.length / 16));
  }

  state.people = people;
  state.hasKadishToday = hasKadishToday;
  state.totalPages = totalPages;
  state.itemsPerPage = hasKadishToday ? 12 : 16;
  state.page = 0;
  state.pageShift = 0;
  state.filterString = string;
}
