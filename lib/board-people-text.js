const crypto = require('crypto');
const Synagogue = require('../models/Synagogue');

function fingerprintPeopleText(people) {
  const hash = crypto.createHash('sha256');
  const list = Array.isArray(people) ? people : [];

  for (const person of list) {
    hash.update(String(person && person.id != null ? person.id : ''));
    hash.update('\0');
    hash.update((person && person.text) || '');
    hash.update('\0');
  }

  return hash.digest('hex').slice(0, 16);
}

async function loadPeopleTextFingerprint(slug) {
  const doc = await Synagogue.findOne({ slug }, { people: { id: 1, text: 1 } }).lean();
  if (!doc) {
    return '';
  }
  return fingerprintPeopleText(doc.people);
}

function personIdQueryValue(personId) {
  const asNumber = Number(personId);
  return Number.isFinite(asNumber) ? asNumber : String(personId);
}

async function loadBoardPersonWithText(slug, personId) {
  const id = personIdQueryValue(personId);
  const doc = await Synagogue.findOne(
    { slug, 'people.id': id },
    { people: { $elemMatch: { id } } },
  ).lean();

  const person = doc && Array.isArray(doc.people) ? doc.people[0] : null;
  return person || null;
}

module.exports = {
  fingerprintPeopleText,
  loadPeopleTextFingerprint,
  loadBoardPersonWithText,
};
