const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  composePersonName,
  composeAdminName,
  torahReadingName,
  detectNameOrder,
  classifyNameOrder,
  isSurnameLikeToken,
  normalizeNameOrder,
  normalizeParentRelation,
  hasLegacyMarker,
  resolveCommunityNameOrder,
} = require('../lib/person-name');
const {
  buildDeceasedBoardNameFromAdminForm,
  resolveAdminNameParts,
} = require('../lib/admin-deceased-name');
const { buildPersonFromAddRequest } = require('../lib/person-add-request-approve');
const { toPublicBoardPayload } = require('../lib/public-board');
const { parseDeceasedEntriesFromBody } = require('../lib/public-submission-form');

const splitPerson = {
  name: 'Иванов Иван бен Александр',
  surname: 'Иванов',
  givenName: 'Иван',
  parentName: 'Александр',
  parentRelation: 'ben',
  gender: 'male',
};

describe('1.41.0: composePersonName from the normalized parts', () => {
  it('surname first', () => {
    assert.equal(composePersonName(splitPerson, 'surname-first'), 'Иванов Иван бен Александр');
  });

  it('given name first — the surname goes right after the first given-name token', () => {
    assert.equal(composePersonName(splitPerson, 'given-first'), 'Иван Иванов бен Александр');
  });

  it('builds the marker from parentRelation', () => {
    assert.equal(
      composePersonName({ givenName: 'Иван', parentName: 'Александр', parentRelation: 'ben' }, 'surname-first'),
      'Иван бен Александр',
    );
    assert.equal(
      composePersonName({ givenName: 'Анна', parentName: 'Моисей', parentRelation: 'bat' }, 'surname-first'),
      'Анна бат Моисей',
    );
  });

  it('falls back to the gender when parentRelation is empty', () => {
    assert.equal(
      composePersonName({ givenName: 'Анна', parentName: 'Моисей', gender: 'female' }, 'surname-first'),
      'Анна бат Моисей',
    );
    assert.equal(
      composePersonName({ givenName: 'Иван', parentName: 'Александр', gender: 'male' }, 'surname-first'),
      'Иван бен Александр',
    );
  });

  it('writes the marker in the script of the name', () => {
    assert.equal(
      composePersonName({ surname: 'כהן', givenName: 'יצחק', parentName: 'אברהם', parentRelation: 'ben' }, 'surname-first'),
      'כהן יצחק בן אברהם',
    );
    assert.equal(
      composePersonName({ surname: 'כהן', givenName: 'יצחק', parentName: 'אברהם', parentRelation: 'ben' }, 'given-first'),
      'יצחק כהן בן אברהם',
    );
    assert.equal(
      composePersonName({ surname: 'Cohen', givenName: 'Sarah', parentName: 'David', parentRelation: 'bat' }, 'given-first'),
      'Sarah Cohen bat David',
    );
  });

  it('uses the community language only when the name itself has no script', () => {
    assert.equal(
      composePersonName({ givenName: 'John', parentName: 'David', parentRelation: 'ben' }, 'surname-first', 'ru'),
      'John ben David',
    );
    assert.equal(
      composePersonName({ givenName: 'Иван', parentName: 'Александр', parentRelation: 'ben' }, 'surname-first', 'en'),
      'Иван бен Александр',
    );
  });

  it("'' order falls back to surname-first", () => {
    assert.equal(composePersonName(splitPerson, ''), 'Иванов Иван бен Александр');
  });

  it('given-first keeps parentheses and punctuation in the given name', () => {
    assert.equal(
      composePersonName(
        { surname: 'Виленкин', givenName: 'Евгений', parentName: 'Самуила (Йосиф)', parentRelation: 'ben' },
        'given-first',
      ),
      'Евгений Виленкин бен Самуила (Йосиф)',
    );
    assert.equal(
      composePersonName({ surname: 'Кац', givenName: 'И.', parentName: 'Моисей, мл.', parentRelation: 'ben' }, 'given-first'),
      'И. Кац бен Моисей, мл.',
    );
  });

  it('keeps a legacy given name that already carries its marker (no second marker)', () => {
    assert.equal(
      composePersonName({ surname: 'Иванов', givenName: 'Иван бен Александр' }, 'surname-first'),
      'Иванов Иван бен Александр',
    );
    assert.equal(
      composePersonName({ surname: 'Иванов', givenName: 'Иван бен Александр', parentName: 'Моисей' }, 'given-first'),
      'Иван Иванов бен Александр',
    );
    assert.equal(composePersonName({ givenName: 'אברהם בן יצחק' }, 'surname-first'), 'אברהם בן יצחק');
  });

  it('returns the stored name unchanged when the person was never split', () => {
    assert.equal(composePersonName({ name: 'Иван бен Александр' }, 'given-first'), 'Иван бен Александр');
    assert.equal(composePersonName({ name: 'Иван', surname: 'Иванов' }, 'given-first'), 'Иван');
    assert.equal(composePersonName(null, 'given-first'), '');
  });
});

describe('1.41.0: composeAdminName is always the canonical surname-first name', () => {
  it('ignores the board order', () => {
    assert.equal(composeAdminName(splitPerson), 'Иванов Иван бен Александр');
    assert.equal(
      composeAdminName({ surname: 'Cohen', givenName: 'Sarah', parentName: 'David', parentRelation: 'bat' }),
      'Cohen Sarah bat David',
    );
  });

  it('without a surname the name is the given name + marker + parent', () => {
    assert.equal(
      composeAdminName({ givenName: 'Иван', parentName: 'Александр', parentRelation: 'ben' }),
      'Иван бен Александр',
    );
  });
});

describe('1.40.0 I88 / 1.41.0: torahReadingName', () => {
  it('is the base without the surname (given name + marker + parent)', () => {
    assert.equal(torahReadingName(splitPerson), 'Иван бен Александр');
    assert.equal(
      torahReadingName({ surname: 'Иванов', givenName: 'Иван', parentName: 'Александр', parentRelation: 'ben' }),
      'Иван бен Александр',
    );
  });

  it('removes a known surname from the stored name (leading or trailing)', () => {
    assert.equal(torahReadingName({ name: 'Иванов Иван бен Александр', surname: 'Иванов' }), 'Иван бен Александр');
    assert.equal(torahReadingName({ name: 'Иван бен Александр Иванов', surname: 'Иванов' }), 'Иван бен Александр');
  });

  it('removes a known surname from the middle of a given-first name', () => {
    assert.equal(torahReadingName({ name: 'Иван Иванов бен Александр', surname: 'Иванов' }), 'Иван бен Александр');
    assert.equal(torahReadingName({ name: 'Sarah Cohen bat David', surname: 'Cohen' }), 'Sarah bat David');
    assert.equal(torahReadingName({ name: 'יצחק כהן בן אברהם', surname: 'כהן' }), 'יצחק בן אברהם');
  });

  it('keeps the full name when no surname is set', () => {
    assert.equal(torahReadingName({ name: 'Иван бен Александр' }), 'Иван бен Александр');
    assert.equal(torahReadingName({ name: 'כהן יצחק בן אברהם' }), 'כהן יצחק בן אברהם');
    assert.equal(torahReadingName({}), '');
  });

  it('keeps the name when the surname is not part of it', () => {
    assert.equal(torahReadingName({ name: 'Иван бен Александр', surname: 'Петров' }), 'Иван бен Александр');
  });
});

describe('1.42.0 I92: leftover surname inside givenName', () => {
  it('drops «X (Y)» when the surname field is empty and the community is surname-first', () => {
    assert.equal(
      torahReadingName({ givenName: 'Буторин (Иванов) Софья бен Моисей' }, 'ru', 'surname-first'),
      'Софья бен Моисей',
    );
  });

  it('drops a dashed double surname («X-Y Z» and «X - Y Z»)', () => {
    assert.equal(
      torahReadingName({ givenName: 'Иванов-Петров Анна бат Сара' }, 'ru', 'surname-first'),
      'Анна бат Сара',
    );
    assert.equal(
      torahReadingName({ givenName: 'Иванов - Петров Анна бат Сара' }, 'ru', 'surname-first'),
      'Анна бат Сара',
    );
  });

  it('drops a leading token that is not a given name when the next two are', () => {
    assert.equal(
      torahReadingName({ givenName: 'Буторин Анна Галина' }, 'ru', 'surname-first'),
      'Анна Галина',
    );
    assert.equal(
      torahReadingName(
        { givenName: 'Буторин Софья Маша бен Моисей' },
        'ru',
        'surname-first',
        new Set(['софья', 'маша']),
      ),
      'Софья Маша бен Моисей',
    );
  });

  it('does not drop a Hebrew name, a given-first community, or a result that is only бен/бат', () => {
    assert.equal(
      torahReadingName({ givenName: 'כהן (לוי) יצחק בן אברהם' }, 'he', 'surname-first'),
      'כהן (לוי) יצחק בן אברהם',
    );
    assert.equal(
      torahReadingName({ givenName: 'Иванов-Петров Анна бат Сара' }, 'ru', 'given-first'),
      'Иванов-Петров Анна бат Сара',
    );
    assert.equal(
      torahReadingName({ givenName: 'Лишний (Фам) бен' }, 'ru', 'surname-first'),
      'Лишний (Фам) бен',
    );
    assert.equal(
      torahReadingName({ surname: 'Иванов', givenName: 'Анна Галина' }, 'ru', 'surname-first'),
      'Анна Галина',
    );
  });
});

describe('1.41.0: parent relation helpers', () => {
  it('normalizes the marker', () => {
    assert.equal(normalizeParentRelation('ben'), 'ben');
    assert.equal(normalizeParentRelation('bat'), 'bat');
    assert.equal(normalizeParentRelation('בן'), 'ben');
    assert.equal(normalizeParentRelation('בת'), 'bat');
    assert.equal(normalizeParentRelation('бен'), 'ben');
    assert.equal(normalizeParentRelation(''), '');
    assert.equal(normalizeParentRelation('uncle'), '');
  });

  it('detects a legacy marker inside the given name', () => {
    assert.equal(hasLegacyMarker('Иван бен Александр'), true);
    assert.equal(hasLegacyMarker('שרה בת אברהם'), true);
    assert.equal(hasLegacyMarker('Sarah bat David'), true);
    assert.equal(hasLegacyMarker('Иван'), false);
    assert.equal(hasLegacyMarker(''), false);
  });
});

describe('1.40.0 I88: surname morphology', () => {
  it('recognises Russian surname endings', () => {
    ['Иванов', 'Кацман', 'Рабинович', 'Иванова', 'Левина', 'Шнейдер', 'Кацкая', 'Зарецкий'].forEach((token) => {
      assert.equal(isSurnameLikeToken(token), true, token);
    });
    ['Иван', 'Сара', 'Моше', 'Александр', 'Коган'].forEach((token) => {
      assert.equal(isSurnameLikeToken(token), false, token);
    });
  });

  it('never treats a בן/בת prefix as a surname', () => {
    assert.equal(isSurnameLikeToken('бен'), false);
    assert.equal(isSurnameLikeToken('בן'), false);
    assert.equal(isSurnameLikeToken('ben'), false);
  });

  it('classifies a single stored name', () => {
    assert.equal(classifyNameOrder('Иванов Иван бен Александр'), 'surname-first');
    assert.equal(classifyNameOrder('Иван Иванов бен Александр'), 'given-first');
    assert.equal(classifyNameOrder('Иван'), '');
    assert.equal(classifyNameOrder('יצחק בן אברהם'), '');
  });
});

describe('1.40.0 I88: detectNameOrder', () => {
  it('detects the majority order', () => {
    assert.equal(
      detectNameOrder(['Иванов Иван', 'Кацман Сара', 'Левин Моше бен Авраам']),
      'surname-first',
    );
    assert.equal(
      detectNameOrder(['Иван Иванов', 'Сара Кацман', 'Моше Левин']),
      'given-first',
    );
  });

  it("returns '' without a clear margin", () => {
    assert.equal(detectNameOrder(['Иванов Иван', 'Сара Иванов']), '');
    assert.equal(detectNameOrder(['Иван']), '');
    assert.equal(detectNameOrder([]), '');
    assert.equal(detectNameOrder(['כהן יצחק', 'יצחק כהן']), '');
  });

  it('accepts people objects', () => {
    assert.equal(
      detectNameOrder([{ name: 'Иванов Иван' }, { name: 'Левина Сара' }, { name: 'Левин Моше' }]),
      'surname-first',
    );
  });

  it('ignores Hebrew names', () => {
    assert.equal(
      detectNameOrder(['יצחק בן אברהם', 'שרה בת דוד', 'Иванов Иван', 'Кацман Сара', 'Левин Моше']),
      'surname-first',
    );
  });
});

describe('1.40.0 I88: community name order', () => {
  it('normalizes the stored setting', () => {
    assert.equal(normalizeNameOrder('given-first'), 'given-first');
    assert.equal(normalizeNameOrder('surname-first'), 'surname-first');
    assert.equal(normalizeNameOrder('whatever'), '');
    assert.equal(normalizeNameOrder(undefined), '');
  });

  it('prefers the saved setting, then the detected order, then the fallback', () => {
    assert.equal(
      resolveCommunityNameOrder({ nameOrder: 'given-first', people: [{ name: 'Иванов Иван' }] }),
      'given-first',
    );
    assert.equal(
      resolveCommunityNameOrder({ nameOrder: '', people: [{ name: 'Иванов Иван' }, { name: 'Кацман Сара' }] }),
      'surname-first',
    );
    assert.equal(resolveCommunityNameOrder({ nameOrder: '', people: [] }), 'surname-first');
    assert.equal(resolveCommunityNameOrder({ people: [] }, 'given-first'), 'given-first');
  });
});

describe('1.41.0: admin add/edit form with three name parts', () => {
  const body = { surname: 'Иванов', givenName: 'Иван', parentName: 'Александр', gender: 'male' };

  it('stores the three parts and the canonical name', () => {
    assert.deepEqual(buildDeceasedBoardNameFromAdminForm(body, 'ru'), {
      name: 'Иванов Иван бен Александр',
      surname: 'Иванов',
      givenName: 'Иван',
      parentName: 'Александр',
      parentRelation: 'ben',
      gender: 'male',
    });
  });

  it('the canonical name does not depend on the community order', () => {
    assert.equal(
      buildDeceasedBoardNameFromAdminForm(body, 'ru').name,
      'Иванов Иван бен Александр',
    );
  });

  it('the male/female choice decides the marker', () => {
    assert.equal(
      buildDeceasedBoardNameFromAdminForm({ surname: 'Иванов', givenName: 'Иван', parentName: 'Александр', gender: 'female' }, 'ru').name,
      'Иванов Иван бат Александр',
    );
    assert.equal(
      buildDeceasedBoardNameFromAdminForm({ surname: 'Иванова', givenName: 'Анна', parentName: 'Моисей', gender: 'female' }, 'ru').parentRelation,
      'bat',
    );
  });

  it('removes a surname typed inside the given-name field', () => {
    const built = buildDeceasedBoardNameFromAdminForm({ ...body, givenName: 'Иванов Иван' }, 'ru');
    assert.equal(built.givenName, 'Иван');
    assert.equal(built.name, 'Иванов Иван бен Александр');
  });

  it('a legacy given name that already carries the marker is kept as stored', () => {
    const built = buildDeceasedBoardNameFromAdminForm(
      { surname: 'Иванов', givenName: 'Иван бен Александр', parentName: 'Александр', gender: 'male' },
      'ru',
    );
    assert.equal(built.givenName, 'Иван бен Александр');
    assert.equal(built.parentName, '');
    assert.equal(built.name, 'Иванов Иван бен Александр');
  });

  it('a Hebrew name gets the Hebrew marker', () => {
    assert.equal(
      buildDeceasedBoardNameFromAdminForm({ surname: 'כהן', givenName: 'משה', parentName: 'אברהם', gender: 'male' }, 'he').name,
      'כהן משה בן אברהם',
    );
  });

  it("a Russian parent name typed in the genitive goes in the nominative (I87)", () => {
    assert.equal(
      buildDeceasedBoardNameFromAdminForm({ givenName: 'Софья', parentName: 'Рувима', gender: 'female' }, 'ru').name,
      'Софья бат Рувим',
    );
  });

  it('surname without a parent name keeps the given name alone', () => {
    assert.deepEqual(buildDeceasedBoardNameFromAdminForm({ surname: 'Иванов', givenName: 'Иван' }, 'ru'), {
      name: 'Иванов Иван',
      surname: 'Иванов',
      givenName: 'Иван',
      parentName: '',
      parentRelation: '',
      gender: '',
    });
  });

  it('an empty form stays empty', () => {
    assert.deepEqual(buildDeceasedBoardNameFromAdminForm({}, 'ru'), {
      name: '',
      surname: '',
      givenName: '',
      parentName: '',
      parentRelation: '',
      gender: '',
    });
  });

  it('still accepts the legacy name/fatherName fields', () => {
    const built = buildDeceasedBoardNameFromAdminForm({ name: 'Иван', fatherName: 'Александр', gender: 'male' }, 'ru');
    assert.equal(built.givenName, 'Иван');
    assert.equal(built.parentName, 'Александр');
    assert.equal(built.name, 'Иван бен Александр');
  });

  it('a pasted full name without a surname field is split at the marker', () => {
    const built = buildDeceasedBoardNameFromAdminForm({ name: 'Иван Иванов бен Александр', gender: 'male' }, 'ru');
    assert.equal(built.name, 'Иван Иванов бен Александр');
  });
});

describe('1.41.0: editing keeps an untouched legacy person unchanged', () => {
  it('an unsplit legacy person keeps its stored name when the parts were not touched', () => {
    const stored = { name: 'Иван бен Александр' };
    assert.deepEqual(
      resolveAdminNameParts({ givenName: 'Иван бен Александр', surname: '', parentName: '' }, stored, 'ru'),
      { changed: false },
    );
  });

  it('a split person keeps its stored name when nothing was touched', () => {
    assert.deepEqual(resolveAdminNameParts({
      givenName: 'Иван',
      surname: 'Иванов',
      parentName: 'Александр',
      gender: 'male',
    }, splitPerson, 'ru'), { changed: false });
  });

  it('a changed part rewrites the canonical name', () => {
    const parts = resolveAdminNameParts({
      givenName: 'Иосиф',
      surname: 'Иванов',
      parentName: 'Александр',
      gender: 'male',
    }, splitPerson, 'ru');
    assert.equal(parts.changed, true);
    assert.equal(parts.name, 'Иванов Иосиф бен Александр');
    assert.equal(parts.parentRelation, 'ben');
  });

  it('changes the marker with the gender choice', () => {
    const parts = resolveAdminNameParts({
      givenName: 'Иван',
      surname: 'Иванов',
      parentName: 'Александр',
      gender: 'female',
    }, splitPerson, 'ru');
    assert.equal(parts.changed, true);
    assert.equal(parts.parentRelation, 'bat');
    assert.equal(parts.name, 'Иванов Иван бат Александр');
  });

  it('filling the parts of a legacy person splits it', () => {
    const parts = resolveAdminNameParts({
      givenName: 'Иван',
      surname: 'Иванов',
      parentName: 'Александр',
      gender: 'male',
    }, { name: 'Иван бен Александр' }, 'ru');
    assert.equal(parts.changed, true);
    assert.equal(parts.name, 'Иванов Иван бен Александр');
    assert.equal(parts.givenName, 'Иван');
  });
});

describe('1.41.0: public submission → approval', () => {
  it('the public form keeps the three parts apart', () => {
    const [entry] = parseDeceasedEntriesFromBody({
      deceased: {
        0: {
          surname: 'Иванов',
          givenName: 'Иван',
          parentName: 'Александр',
          deceasedGender: 'male',
          deathDate: '01.02.2020',
          relationKey: 'father',
        },
      },
      lang: 'ru',
    });
    assert.equal(entry.surname, 'Иванов');
    assert.equal(entry.givenName, 'Иван');
    assert.equal(entry.parentName, 'Александр');
    assert.equal(entry.parentRelation, 'ben');
    assert.equal(entry.name, 'Иванов Иван');
  });

  it('a female submission gets the בת marker', () => {
    const [entry] = parseDeceasedEntriesFromBody({
      deceased: { 0: { surname: 'Иванова', givenName: 'Анна', parentName: 'Моисей', deceasedGender: 'female' } },
      lang: 'ru',
    });
    assert.equal(entry.parentRelation, 'bat');
  });

  it('legacy firstName/fatherName fields keep working', () => {
    const [entry] = parseDeceasedEntriesFromBody({
      deceased: { 0: { surname: 'Иванов', firstName: 'Иван', fatherName: 'Александр', deceasedGender: 'male' } },
      lang: 'ru',
    });
    assert.equal(entry.givenName, 'Иван');
    assert.equal(entry.parentName, 'Александр');
  });

  it('approval copies the three parts into the person', () => {
    const person = buildPersonFromAddRequest({
      deceasedName: 'Иванов Иван',
      deceasedSurname: 'Иванов',
      deceasedGivenName: 'Иван',
      deceasedParentName: 'Александр',
      deceasedParentRelation: 'ben',
      deceasedGender: 'male',
    }, 'ru');
    assert.equal(person.surname, 'Иванов');
    assert.equal(person.givenName, 'Иван');
    assert.equal(person.parentName, 'Александр');
    assert.equal(person.parentRelation, 'ben');
    assert.equal(person.name, 'Иванов Иван бен Александр');
  });

  it('older requests without the split still get ben/bat', () => {
    const person = buildPersonFromAddRequest({
      deceasedName: 'Cohen Sarah',
      deceasedFatherName: 'David',
      deceasedGender: 'female',
    }, 'en');
    assert.equal(person.name, 'Cohen Sarah bat David');
    assert.equal(person.surname, '');
    assert.equal(person.givenName, 'Cohen Sarah');
    assert.equal(person.parentRelation, 'bat');
  });

  it('an approved legacy request with a marker in the name is not doubled', () => {
    const person = buildPersonFromAddRequest({
      deceasedName: 'Иванов Иван бен Александр',
      deceasedSurname: 'Иванов',
      deceasedGivenName: 'Иван бен Александр',
      deceasedFatherName: 'Александр',
      deceasedGender: 'male',
    }, 'ru');
    assert.equal(person.name, 'Иванов Иван бен Александр');
    assert.equal(person.parentName, '');
  });
});

describe('1.41.0: board payload', () => {
  it('composes the name by the community order and keeps the Torah reading name', () => {
    const payload = toPublicBoardPayload({ slug: 'demo', nameOrder: 'given-first', people: [splitPerson] });
    assert.equal(payload.people[0].name, 'Иван Иванов бен Александр');
    assert.equal(payload.people[0].torahName, 'Иван бен Александр');
    assert.equal(payload.people[0].surname, undefined);
    assert.equal(payload.people[0].givenName, undefined);
    assert.equal(payload.people[0].parentName, undefined);
  });

  it('surname-first when the community has no order', () => {
    const payload = toPublicBoardPayload({ slug: 'demo', people: [splitPerson] });
    assert.equal(payload.people[0].name, 'Иванов Иван бен Александр');
    assert.equal(payload.people[0].torahName, 'Иван бен Александр');
  });

  it('people without a split keep their name and use it for the Torah reading', () => {
    const payload = toPublicBoardPayload({
      slug: 'demo',
      nameOrder: 'given-first',
      people: [{ id: 2, name: 'Иван бен Александр' }],
    });
    assert.equal(payload.people[0].name, 'Иван бен Александр');
    assert.equal(payload.people[0].torahName, 'Иван бен Александр');
  });

  it('a Hebrew community gets the Hebrew marker', () => {
    const payload = toPublicBoardPayload({
      slug: 'demo',
      language: 'he',
      people: [{ id: 3, surname: 'כהן', givenName: 'יצחק', parentName: 'אברהם', parentRelation: 'ben' }],
    });
    assert.equal(payload.people[0].name, 'כהן יצחק בן אברהם');
  });
});
