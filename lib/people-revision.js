const { getPersonContacts } = require('./person-contact');

/**
 * Stable fingerprint of the people list for compute caches (invalidates on CRUD/import).
 */
function computePeopleRevision(people) {
  const list = Array.isArray(people) ? people : [];
  let maxId = 0;
  let deathSig = 0;
  let contactSig = 0;

  for (const person of list) {
    const id = Number(person && person.id);
    if (Number.isFinite(id) && id > maxId) {
      maxId = id;
    }
    const death = person && person.gregorianDateOfDeath;
    if (death && death.month && death.date) {
      deathSig += (death.year || 0) * 10000 + death.month * 100 + death.date;
      deathSig += id;
    }
    const contacts = getPersonContacts(person);
    for (const contact of contacts) {
      contactSig += String(contact.name || '').length;
      contactSig += String(contact.phone || '').length;
      contactSig += String(contact.email || '').length;
      contactSig += id;
    }
    if (person && person.internalNotes) {
      contactSig += String(person.internalNotes).length + id;
    }
  }

  return `${list.length}:${maxId}:${deathSig}:${contactSig}`;
}

module.exports = {
  computePeopleRevision,
};
