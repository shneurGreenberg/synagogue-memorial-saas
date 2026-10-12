function shouldUseKadishBoardLayout(peopleCount, yahrzeitTodayCount) {
  return peopleCount === 1 || yahrzeitTodayCount === 1;
}

function shouldPrioritizeYahrzeitForKadish(yahrzeitTodayCount, peopleCount) {
  return yahrzeitTodayCount === 1 && peopleCount > 1;
}

function prioritizeYahrzeitForKadish(people) {
  const yahrzeitToday = people.filter((person) => person.passedToday);

  if (!shouldPrioritizeYahrzeitForKadish(yahrzeitToday.length, people.length)) {
    return people;
  }

  const featuredIds = new Set(yahrzeitToday.map((person) => person.id));
  const others = people.filter((person) => !featuredIds.has(person.id));

  return [...yahrzeitToday, ...others];
}

function computeKadishPagination(peopleCount, hasKadishToday) {
  if (!hasKadishToday) {
    return {
      itemsPerPage: 16,
      totalPages: Math.max(1, Math.ceil(peopleCount / 16)),
    };
  }

  if (peopleCount > 12) {
    return {
      itemsPerPage: 12,
      totalPages: 1 + Math.ceil((peopleCount - 12) / 16),
    };
  }

  return {
    itemsPerPage: 12,
    totalPages: 1,
  };
}

module.exports = {
  shouldUseKadishBoardLayout,
  shouldPrioritizeYahrzeitForKadish,
  prioritizeYahrzeitForKadish,
  computeKadishPagination,
};
