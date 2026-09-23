const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  absoluteUrl,
  getPublicOrigin,
  toEmbedPerson,
  toEmbedPeoplePayload,
  PUBLIC_PERSON_KEYS,
} = require('../lib/public-people-api');

describe('public people API payload', () => {
  const samplePerson = {
    id: 14,
    name: 'Person One',
    photo: 'a.jpg',
    photoCrop: { x: 40, y: 60, zoom: 1.2 },
    title: 'Title',
    text: '<p>Biography</p>',
    gregorianDateOfDeath: { month: 1, date: 6, year: 1950 },
    contact: { name: 'Relative', phone: '+100', email: 'secret@example.com' },
    contacts: [{ phone: '+200', email: 'other@example.com' }],
  };

  it('keeps biography HTML and only public person keys', () => {
    const person = toEmbedPerson(samplePerson, {
      origin: 'https://board.example',
      slug: 'demo',
    });

    assert.equal(person.id, 14);
    assert.equal(person.name, 'Person One');
    assert.equal(person.text, '<p>Biography</p>');
    assert.equal(person.photo, 'a.jpg');
    assert.equal(person.photoUrl, 'https://board.example/photos/a.jpg');
    assert.equal(person.photoThumbUrl, 'https://board.example/photos/a.jpg?w=256');
    assert.equal(person.cardUrl, 'https://board.example/s/demo/card/14');
    assert.equal(person.contact, undefined);
    assert.equal(person.contacts, undefined);
    assert.equal(person.hebrewDateOfDeath.label, '17 טבת');
    assert.equal(person.hebrewDateOfDeath.month, 10);
    assert.equal(person.hebrewDateOfDeath.year, 5710);
    assert.equal(person.gregorianDateOfDeath.year, 1950);
    assert.deepEqual(Object.keys(person).sort(), [...PUBLIC_PERSON_KEYS].sort());
    assert.equal(JSON.stringify(person).includes('secret@example.com'), false);
    assert.equal(JSON.stringify(person).includes('+100'), false);
  });

  it('returns synagogue metadata and people list', () => {
    const payload = toEmbedPeoplePayload({
      slug: 'demo',
      name: 'Demo Synagogue',
      title: 'Demo',
      language: 'he',
      people: [samplePerson],
    }, { origin: 'https://board.example' });

    assert.equal(payload.count, 1);
    assert.equal(payload.synagogue.slug, 'demo');
    assert.equal(payload.synagogue.language, 'he');
    assert.equal(payload.people[0].name, 'Person One');
    assert.equal(payload.people[0].contact, undefined);
  });

  it('builds origin from forwarded headers', () => {
    const origin = getPublicOrigin({
      protocol: 'http',
      get(name) {
        if (name === 'X-Forwarded-Proto') return 'https, http';
        if (name === 'X-Forwarded-Host') return 'kadish.example, localhost';
        if (name === 'Host') return 'localhost:3000';
        return '';
      },
    });

    assert.equal(origin, 'https://kadish.example');
  });

  it('prefers PUBLIC_ORIGIN over forwarded headers', () => {
    const previous = process.env.PUBLIC_ORIGIN;
    process.env.PUBLIC_ORIGIN = 'https://synagogue-kadish-shneur.amvera.io/';

    try {
      const origin = getPublicOrigin({
        protocol: 'http',
        get(name) {
          if (name === 'Host') return 'localhost:3000';
          return '';
        },
      });
      assert.equal(origin, 'https://synagogue-kadish-shneur.amvera.io');
    } finally {
      if (previous === undefined) {
        delete process.env.PUBLIC_ORIGIN;
      } else {
        process.env.PUBLIC_ORIGIN = previous;
      }
    }
  });

  it('joins origin and path without duplicating slashes', () => {
    assert.equal(absoluteUrl('https://a.example', '/photos/x.jpg'), 'https://a.example/photos/x.jpg');
    assert.equal(absoluteUrl('', '/photos/x.jpg'), '/photos/x.jpg');
    assert.equal(absoluteUrl('https://a.example', ''), '');
  });
});
