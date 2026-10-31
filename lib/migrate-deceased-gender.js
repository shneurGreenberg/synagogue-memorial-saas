/* 1.31.1: idempotent gender backfill for deceased records. Only touches records without male/female. */
'use strict';
const { planGenderMigration, countGenders } = require('./deceased-gender');

async function migrateDeceasedGender(Synagogue, { dryRun = false } = {}) {
  const report = [];
  const docs = await Synagogue.find({}, { slug: 1, people: 1 }).lean();
  for (const doc of docs) {
    const people = doc.people || [];
    const updates = planGenderMigration(people);
    if (!dryRun && updates.length) {
      const ops = updates.filter((u) => u._id).map((u) => ({
        updateOne: {
          filter: { _id: doc._id, 'people._id': u._id },
          update: { $set: { 'people.$.gender': u.gender } },
        },
      }));
      if (ops.length) await Synagogue.bulkWrite(ops, { ordered: false });
    }
    const after = people.map((p, i) => {
      const u = updates.find((x) => x.index === i);
      return u ? { ...p, gender: u.gender } : p;
    });
    report.push({ slug: doc.slug, updated: updates.length, ...countGenders(after) });
  }
  return report;
}

module.exports = { migrateDeceasedGender };
