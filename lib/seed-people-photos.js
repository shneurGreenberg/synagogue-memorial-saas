const fs = require('fs');
const path = require('path');
const Synagogue = require('../models/Synagogue');
const { fetchPlaceholderPhoto } = require('./placeholder-photo');
const { PHOTOS_DIR } = require('./storage-paths');

function pickSource(personId, mode) {
  if (mode === 'mixed') {
    return personId % 3 === 0 ? 'generated' : 'random';
  }
  return mode;
}

async function seedPhotosForSynagogue(slug, options = {}) {
  const {
    source = 'mixed',
    force = false,
    limit = 15,
  } = options;

  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }

  const synagogue = await Synagogue.findOne({ slug });
  if (!synagogue) {
    throw new Error(`Synagogue not found: ${slug}`);
  }

  let updated = 0;
  let skipped = 0;
  const targets = limit > 0 ? synagogue.people.slice(0, limit) : synagogue.people;

  for (const person of targets) {
    if (person.photo && !force) {
      const existing = path.join(PHOTOS_DIR, person.photo);
      if (fs.existsSync(existing)) {
        skipped += 1;
        continue;
      }
    }

    const personSource = pickSource(person.id, source);
    const buffer = await fetchPlaceholderPhoto(person.id, personSource);
    const ext = personSource === 'dicebear' ? '.png' : '.jpg';
    const filename = `seed-${person.id}-${Date.now()}${ext}`;

    fs.writeFileSync(path.join(PHOTOS_DIR, filename), buffer);

    await Synagogue.updateOne(
      { slug, 'people.id': person.id },
      { $set: { 'people.$.photo': filename } },
    );

    updated += 1;
  }

  return { updated, skipped, total: targets.length };
}

module.exports = { seedPhotosForSynagogue };
