export function mergePersonText(existingPeople, nextPeople) {
  if (!Array.isArray(existingPeople) || !Array.isArray(nextPeople)) {
    return nextPeople;
  }

  const textById = new Map();
  existingPeople.forEach((person) => {
    if (person && person.id != null && person.text) {
      textById.set(String(person.id), person.text);
    }
  });

  return nextPeople.map((person) => {
    if (!person || person.text || !textById.has(String(person.id))) {
      return person;
    }

    return {
      ...person,
      text: textById.get(String(person.id)),
    };
  });
}

export function mergeBoardPayload(existing, next, { preserveText = true } = {}) {
  if (!existing) {
    return next;
  }

  if (!preserveText) {
    return next;
  }

  return {
    ...next,
    people: mergePersonText(existing.people, next.people),
  };
}
