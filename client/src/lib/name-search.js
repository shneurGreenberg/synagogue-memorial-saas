import { translitSplit } from './novosibirsk';

export function attachNameComponents(person) {
  return {
    ...person,
    nameComponents: translitSplit(person.name || ''),
  };
}

export function searchPeopleByString(string, allPeople) {
  const searchComponents = translitSplit(string);

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

export function applySearchToPaginationState(state, string) {
  const people = searchPeopleByString(string, state.allPeople);

  const hasKadishToday =
    people.length === 1
    || people.filter((person) => person.passedToday).length === 1;

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
