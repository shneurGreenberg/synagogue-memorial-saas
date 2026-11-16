const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  composePersonName,
  torahReadingName,
  detectNameOrder,
  classifyNameOrder,
  isSurnameLikeToken,
  normalizeNameOrder,
  resolveCommunityNameOrder,
} = require('../lib/person-name');
const { buildDeceasedBoardNameFromAdminForm } = require('../lib/admin-deceased-name');
const { buildPersonFromAddRequest } = require('../lib/person-add-request-approve');
const { toPublicBoardPayload } = require('../lib/public-board');
const { parseDeceasedEntriesFromBody } = require('../lib/public-submission-form');

describe('1.40.0 I88: composePersonName', () => {
  const person = {
    name: 'Иванов Иван бен Александр',
    surname: 'Иванов',
    givenName: 'Иван бен Александр',
  };

  it('surname first', () => {
    assert.equal(composePersonName(person, 'surname-first'), 'Иванов Иван бен Александр');
  });

  it('given name first — the surname goes right after the first given-name token', () => {
    assert.equal(composePersonName(person, 'given-first'), 'Иван Иванов бен Александр');
  });

  it('given-first keeps בן/בת right before the parent', () => {
    assert.equal(
      composePersonName({ surname: 'כהן', givenName: 'יצחק בן אברהם' }, 'given-first'),
      'יצחק כהן בן אברהם',
    );
    assert.equal(
      composePersonName({ surname: 'Cohen', givenName: 'Sarah bat David' }, 'given-first'),
      'Sarah Cohen bat David',
    );
  });

  it('given-first keeps parentheses and punctuation in the given name', () => {
    assert.equal(
      composePersonName({ surname: 'Виленкин', givenName: 'Евгений бен Самуила (Йосиф)' }, 'given-first'),
      'Евгений Виленкин бен Самуила (Йосиф)',
    );
    assert.equal(
      composePersonName({ surname: 'Кац', givenName: 'И. бен Моисей, мл.' }, 'given-first'),
      'И. Кац бен Моисей, мл.',
    );
  });

  it("'' order falls back to surname-first", () => {
    assert.equal(composePersonName(person, ''), 'Иванов Иван бен Александр');
  });

  it('returns the stored name unchanged when the person was never split', () => {
    assert.equal(composePersonName({ name: 'Иван бен Александр' }, 'given-first'), 'Иван бен Александр');
    assert.equal(composePersonName({ name: 'Иван', surname: 'Иванов' }, 'given-first'), 'Иван');
    assert.equal(composePersonName({ name: 'Иван', givenName: 'Иван' }, 'given-first'), 'Иван');
    assert.equal(composePersonName(null, 'given-first'), '');
  });
});

describe('1.40.0 I88: torahReadingName', () => {
  it('uses the given name when the person is split', () => {
    assert.equal(
      torahReadingName({ name: 'Иванов Иван бен Александр', surname: 'Иванов', givenName: 'Иван бен Александр' }),
      'Иван бен Александр',
    );
    assert.equal(
      torahReadingName({ name: 'Иван Иванов бен Александр', surname: 'Иванов', givenName: 'Иван бен Александр' }),
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

describe('1.40.0 I88: admin add/edit form', () => {
  it('splits the surname from the given name and composes by order', () => {
    const body = { name: 'Иван', surname: 'Иванов', fatherName: 'Александр', gender: 'male' };
    assert.deepEqual(buildDeceasedBoardNameFromAdminForm(body, 'ru', 'surname-first'), {
      name: 'Иванов Иван бен Александр',
      surname: 'Иванов',
      givenName: 'Иван бен Александр',
      gender: 'male',
    });
    assert.equal(
      buildDeceasedBoardNameFromAdminForm(body, 'ru', 'given-first').name,
      'Иван Иванов бен Александр',
    );
  });

  it('removes a surname typed inside the name field', () => {
    const built = buildDeceasedBoardNameFromAdminForm(
      { name: 'Иванов Иван', surname: 'Иванов', fatherName: 'Александр', gender: 'male' },
      'ru',
      'given-first',
    );
    assert.equal(built.givenName, 'Иван бен Александр');
    assert.equal(built.name, 'Иван Иванов бен Александр');
  });

  it('a given-first stored name does not duplicate the surname on re-save', () => {
    const built = buildDeceasedBoardNameFromAdminForm(
      { name: 'Иван Иванов бен Александр', surname: 'Иванов', fatherName: 'Александр', gender: 'male' },
      'ru',
      'given-first',
    );
    assert.equal(built.givenName, 'Иван бен Александр');
    assert.equal(built.name, 'Иван Иванов бен Александр');
  });

  it('a Hebrew name with a surname stays in Hebrew script', () => {
    assert.equal(
      buildDeceasedBoardNameFromAdminForm(
        { name: 'משה', surname: 'כהן', fatherName: 'אברהם', gender: 'male' },
        'he',
        'surname-first',
      ).name,
      'כהן משה בן אברהם',
    );
  });

  it('without a surname nothing is split (legacy shape)', () => {
    assert.deepEqual(
      buildDeceasedBoardNameFromAdminForm({ name: 'Иван', fatherName: 'Александр', gender: 'male' }, 'ru'),
      { name: 'Иван бен Александр', gender: 'male' },
    );
  });

  it('surname without a parent name is kept apart', () => {
    assert.deepEqual(
      buildDeceasedBoardNameFromAdminForm({ name: 'Иван', surname: 'Иванов' }, 'ru', 'given-first'),
      { name: 'Иван Иванов', surname: 'Иванов', givenName: 'Иван', gender: '' },
    );
  });
});

describe('1.40.0 I88: public submission → approval', () => {
  it('the public form keeps the surname and first name apart', () => {
    const [entry] = parseDeceasedEntriesFromBody({
      deceased: {
        0: {
          surname: 'Иванов',
          firstName: 'Иван',
          fatherName: 'Александр',
          deceasedGender: 'male',
          deathDate: '01.02.2020',
          relationKey: 'father',
        },
      },
      lang: 'ru',
    });
    assert.equal(entry.surname, 'Иванов');
    assert.equal(entry.firstName, 'Иван');
    assert.equal(entry.name, 'Иванов Иван');
  });

  it('approval copies the surname and given name into the person', () => {
    const person = buildPersonFromAddRequest({
      deceasedName: 'Иванов Иван',
      deceasedSurname: 'Иванов',
      deceasedGivenName: 'Иван',
      deceasedFatherName: 'Александр',
      deceasedGender: 'male',
    }, 'ru', 'given-first');
    assert.equal(person.surname, 'Иванов');
    assert.equal(person.givenName, 'Иван бен Александр');
    assert.equal(person.name, 'Иван Иванов бен Александр');
  });

  it('older requests without the split still get ben/bat', () => {
    const person = buildPersonFromAddRequest({
      deceasedName: 'Cohen Sarah',
      deceasedFatherName: 'David',
      deceasedGender: 'female',
    }, 'en');
    assert.equal(person.name, 'Cohen Sarah bat David');
    assert.equal(person.surname, '');
    assert.equal(person.givenName, '');
  });
});

describe('1.40.0 I88: board payload', () => {
  const split = {
    id: 1,
    name: 'Иванов Иван бен Александр',
    surname: 'Иванов',
    givenName: 'Иван бен Александр',
  };

  it('sends the composed name and the Torah reading name', () => {
    const payload = toPublicBoardPayload({ slug: 'demo', nameOrder: 'given-first', people: [split] });
    assert.equal(payload.people[0].name, 'Иван Иванов бен Александр');
    assert.equal(payload.people[0].torahName, 'Иван бен Александр');
    assert.equal(payload.people[0].surname, undefined);
    assert.equal(payload.people[0].givenName, undefined);
  });

  it("with no nameOrder the stored name is used as-is", () => {
    const payload = toPublicBoardPayload({ slug: 'demo', people: [split] });
    assert.equal(payload.people[0].name, 'Иванов Иван бен Александр');
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
});
