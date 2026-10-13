#!/usr/bin/env node
/**
 * Synthetic board payload size + version hash timing (no MongoDB).
 * Usage: node scripts/bench-board-payload.js [peopleCount]
 */
const { performance } = require('node:perf_hooks');
const { toPublicBoardPayload } = require('../lib/public-board');
const { computeBoardVersion } = require('../lib/board-payload');
const { BOARD_SYNAGOGUE_SELECT } = require('../lib/board-synagogue-projection');

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildSyntheticSynagogue(count) {
  const people = [];
  for (let i = 1; i <= count; i += 1) {
    people.push({
      id: i,
      name: `Person ${i}`,
      gregorianDateOfDeath: { month: 1 + (i % 12), date: 1 + (i % 28), year: 1950 + (i % 50) },
      photo: `photo-${i}.jpg`,
      photoCrop: { x: 50, y: 50, zoom: 1 },
      title: 'Title',
      text: '<p>'.concat('Biography '.repeat(40), '</p>'),
      contact: { name: 'Relative', phone: '+10000000000', email: 'secret@example.com' },
      contacts: [{ phone: '+20000000000', email: 'other@example.com' }],
    });
  }

  return {
    slug: 'bench',
    name: 'Bench',
    title: 'Bench',
    titles: { ru: 'Bench', en: 'Bench', he: '' },
    language: 'ru',
    location: { lat: 55, long: 83, city: 'Bench', timezone: 'Asia/Novosibirsk' },
    theme: { primaryColor: '#112233', logo: 'default-logo.svg' },
    people,
    dailyCites: [],
    communityEvents: [],
    boardFeatures: {},
    publicSubmission: { enabled: false },
    memorialQrPanel: {},
    weeklyChapterEnabled: true,
    shabbatTimesEnabled: true,
    adminUsers: [{ username: 'admin' }],
    contactDirectory: [{ id: '1', name: 'Dir', phone: '+1', email: 'a@b.c' }],
    savedViews: [{ id: 'v1', name: 'View', snapshot: { theme: { logo: 'x' } } }],
    provisioning: { notes: 'secret notes', contactFiles: [{ originalName: 'a.csv' }] },
  };
}

function stripLikeMongoProjection(board) {
  const next = { ...board };
  delete next.adminUsers;
  delete next.contactDirectory;
  delete next.savedViews;
  next.provisioning = board.provisioning?.donationQrImage
    ? { donationQrImage: board.provisioning.donationQrImage }
    : {};
  return next;
}

function bench(fn, runs = 7) {
  const times = [];
  let last;
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    last = fn();
    times.push(performance.now() - start);
  }
  return { median: median(times), last };
}

function main() {
  const count = Number(process.argv[2] || 500);
  const full = buildSyntheticSynagogue(count);
  const projected = stripLikeMongoProjection(full);

  const fullPublic = JSON.stringify(toPublicBoardPayload(full, { includeText: false }));
  const projectedPublic = JSON.stringify(toPublicBoardPayload(projected, { includeText: false }));
  const fullDoc = JSON.stringify(full);
  const projectedDoc = JSON.stringify(projected);

  const versionBefore = bench(() => computeBoardVersion(full));
  const versionAfter = bench(() => computeBoardVersion(projected));

  console.log(`Synthetic people: ${count}`);
  console.log(`Mongo projection fields: ${BOARD_SYNAGOGUE_SELECT.split(' ').length} exclusions`);
  console.log('');
  console.log('Document JSON bytes (DB → Node):');
  console.log(`  full load:       ${fullDoc.length}`);
  console.log(`  board projection:${projectedDoc.length} (${((1 - projectedDoc.length / fullDoc.length) * 100).toFixed(1)}% smaller)`);
  console.log('');
  console.log('Public API JSON bytes (slim, includeText=false):');
  console.log(`  from full doc:   ${fullPublic.length}`);
  console.log(`  from projected:  ${projectedPublic.length}`);
  console.log('');
  console.log('computeBoardVersion median ms:');
  console.log(`  full:       ${versionBefore.median.toFixed(3)}`);
  console.log(`  projected:  ${versionAfter.median.toFixed(3)}`);
}

main();
