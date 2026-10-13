const Synagogue = require('../models/Synagogue');
const { collectPeopleMissingHebrewDeath } = require('./person-hebrew-death');

async function backfillPeopleHebrewDeathDates(slug, people) {
  const missing = collectPeopleMissingHebrewDeath(people);
  if (!missing.length || !slug) {
    return;
  }

  await Promise.all(missing.map((entry) => Synagogue.updateOne(
    { slug, 'people.id': entry.id },
    { $set: { 'people.$.hebrewDateOfDeath': entry.hebrewDateOfDeath } },
  ).catch(() => null)));
}

module.exports = {
  backfillPeopleHebrewDeathDates,
};
