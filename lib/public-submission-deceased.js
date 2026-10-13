const Synagogue = require('../models/Synagogue');
const { invalidateBoardCache } = require('./board-cache');
const { parsePhotoCropFromBody } = require('./photo-crop');
const { normalizePersonContact } = require('./person-contact');

async function appendDeceasedPerson(slug, {
  name,
  deathDate,
  contact,
  photoFilename = '',
  photoCrop,
}) {
  const synagogue = await Synagogue.findOne({ slug });
  if (!synagogue) {
    return null;
  }

  const maxId = (synagogue.people || []).reduce((max, person) => (
    person.id > max ? person.id : max
  ), 0);

  const newPerson = {
    id: maxId + 1,
    name,
    gregorianDateOfDeath: deathDate,
    photo: photoFilename || '',
    photoCrop,
    title: '',
    text: '',
    contact: normalizePersonContact(contact),
  };

  await Synagogue.updateOne(
    { slug },
    { $push: { people: newPerson } },
  );
  invalidateBoardCache(slug);

  return newPerson;
}

function photoCropFromBody(body) {
  return parsePhotoCropFromBody(body);
}

module.exports = {
  appendDeceasedPerson,
  photoCropFromBody,
};
