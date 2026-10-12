#!/usr/bin/env node
/**
 * Benchmark yahrzeit / weekly-kaddish CPU work (no MongoDB).
 * Usage: node scripts/bench-yahrzeit.js [peopleCount]
 */
const { performance } = require('perf_hooks');
const { buildYahrzeitPageEntries, buildYahrzeitWeekMissedEntries } = require('../lib/yahrzeit-reminders');
const { buildYahrzeitEntries } = require('../lib/yahrzeit');
const { getWeeklyKaddishEntries } = require('../lib/weekly-kaddish');

const PEOPLE_COUNT = Number(process.argv[2] || process.env.PEOPLE || 500);
const RUNS = Number(process.env.RUNS || 7);
const USE_CACHE = process.env.USE_CACHE === '1';

let getCachedAdminYahrzeitBundle;
let invalidateAdminYahrzeitCache;
try {
  const cacheMod = require('../lib/admin-yahrzeit-cache');
  getCachedAdminYahrzeitBundle = cacheMod.getCachedAdminYahrzeitBundle;
  invalidateAdminYahrzeitCache = cacheMod.invalidateAdminYahrzeitCache;
} catch (err) {
  if (USE_CACHE) {
    console.error('USE_CACHE=1 but lib/admin-yahrzeit-cache.js is missing');
    process.exit(1);
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildSyntheticPeople(count) {
  const people = [];
  for (let i = 0; i < count; i += 1) {
    const month = (i % 12) + 1;
    const date = (i % 28) + 1;
    const year = 1950 + (i % 60);
    people.push({
      id: i + 1,
      name: `Person ${i + 1}`,
      gregorianDateOfDeath: { month, date, year },
      contact: { name: 'Contact', phone: `050${String(i).padStart(7, '0')}`, email: '', platform: 'whatsapp' },
      photo: i % 3 === 0 ? `p${i}.jpg` : '',
      text: i % 5 === 0 ? 'Biography text '.repeat(20) : '',
    });
  }
  return people;
}

function buildSynagogue(people) {
  return {
    slug: 'bench',
    name: 'Bench Synagogue',
    language: 'he',
    adminLanguage: 'he',
    location: { timezone: 'Asia/Jerusalem' },
    yahrzeitReminders: { includeHebrewYahrzeit: true },
    publicSubmission: {},
    people,
  };
}

function timeFn(fn) {
  const start = performance.now();
  const result = fn();
  return { ms: performance.now() - start, result };
}

function benchNamed(name, fn) {
  const samples = [];
  let lastResult;
  for (let i = 0; i < RUNS; i += 1) {
    const { ms, result } = timeFn(fn);
    samples.push(ms);
    lastResult = result;
  }
  return {
    name,
    medianMs: median(samples),
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
    sampleSize: Array.isArray(lastResult) ? lastResult.length : (lastResult && lastResult.entries ? lastResult.entries.length : 0),
  };
}

function benchBundleCold(synagogue, now) {
  if (!USE_CACHE || !invalidateAdminYahrzeitCache) return null;
  invalidateAdminYahrzeitCache('bench');
  const { ms } = timeFn(() => getCachedAdminYahrzeitBundle(synagogue, { now, adminLanguage: 'he' }));
  return { name: 'getCachedAdminYahrzeitBundle (cold)', medianMs: ms, minMs: ms, maxMs: ms };
}

function benchBundleWarm(synagogue, now) {
  if (!USE_CACHE) return null;
  return benchNamed('getCachedAdminYahrzeitBundle (warm)', () => (
    getCachedAdminYahrzeitBundle(synagogue, { now, adminLanguage: 'he' })
  ));
}

async function tryBenchRender(synagogue, context) {
  try {
    const handlebars = require('express-handlebars');
    const path = require('path');
    const fs = require('fs');
    const viewPath = path.join(__dirname, '..', 'views', 'admin', 'yahrzeit.handlebars');
    if (!fs.existsSync(viewPath)) {
      return null;
    }
    const engine = handlebars.create({
      layoutsDir: path.join(__dirname, '..', 'views', 'layouts'),
      defaultLayout: 'admin',
      partialsDir: path.join(__dirname, '..', 'views', 'partials'),
      helpers: {
        t: (key) => key,
      },
    });
    const compiled = await engine.render(path.join(__dirname, '..', 'views', 'admin', 'yahrzeit.handlebars'), {
      ...context,
      synagogue,
      layout: false,
      todayLabel: '2026-10-12',
      weeklyKaddish: null,
      weeklyKaddishWhatsapp: '',
      saved: false,
      adminNavActive: 'yahrzeit',
    });
    const samples = [];
    for (let i = 0; i < Math.min(RUNS, 3); i += 1) {
      const start = performance.now();
      await engine.render(path.join(__dirname, '..', 'views', 'admin', 'yahrzeit.handlebars'), {
        ...context,
        synagogue,
        layout: false,
        todayLabel: '2026-10-12',
        weeklyKaddish: null,
        weeklyKaddishWhatsapp: '',
        saved: false,
        adminNavActive: 'yahrzeit',
      });
      samples.push(performance.now() - start);
    }
    return {
      name: 'handlebars admin/yahrzeit',
      medianMs: median(samples),
      bytes: Buffer.byteLength(compiled, 'utf8'),
    };
  } catch (err) {
    return { name: 'handlebars admin/yahrzeit', error: err.message };
  }
}

async function main() {
  const people = buildSyntheticPeople(PEOPLE_COUNT);
  const synagogue = buildSynagogue(people);
  const now = new Date('2026-10-12T10:00:00+03:00');

  console.log(`bench-yahrzeit people=${PEOPLE_COUNT} runs=${RUNS} useCache=${USE_CACHE}\n`);

  const rows = [
    benchNamed('buildYahrzeitEntries (nav count)', () => buildYahrzeitEntries(synagogue, now)),
    benchNamed('buildYahrzeitPageEntries', () => buildYahrzeitPageEntries(synagogue, now, 'he')),
    benchNamed('buildYahrzeitWeekMissedEntries', () => buildYahrzeitWeekMissedEntries(synagogue, now, 'he')),
    benchNamed('getWeeklyKaddishEntries', () => getWeeklyKaddishEntries(synagogue, now)),
  ];

  const bundleCold = benchBundleCold(synagogue, now);
  if (bundleCold) rows.push(bundleCold);
  const bundleWarm = benchBundleWarm(synagogue, now);
  if (bundleWarm) rows.push(bundleWarm);

  for (const row of rows) {
    console.log(
      `${row.name}: median ${row.medianMs.toFixed(2)} ms`
      + ` (min ${row.minMs.toFixed(2)}, max ${row.maxMs.toFixed(2)})`
      + (row.sampleSize !== undefined ? ` | items ${row.sampleSize}` : ''),
    );
  }

  const entries = buildYahrzeitPageEntries(synagogue, now, 'he');
  const weekEntries = buildYahrzeitWeekMissedEntries(synagogue, now, 'he');
  const renderBench = await tryBenchRender(synagogue, {
    entries,
    weekEntries,
    yahrzeitPeople: people.slice(0, 5),
  });
  if (renderBench) {
    if (renderBench.error) {
      console.log(`\n${renderBench.name}: skipped (${renderBench.error})`);
    } else {
      console.log(
        `\n${renderBench.name}: median ${renderBench.medianMs.toFixed(2)} ms | ${renderBench.bytes} bytes`,
      );
    }
  }

  console.log('\nJSON:', JSON.stringify(rows.map((r) => ({ name: r.name, medianMs: Math.round(r.medianMs * 100) / 100 }))));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
