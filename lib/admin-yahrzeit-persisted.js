const Synagogue = require('../models/Synagogue');
const { computePeopleRevision } = require('./people-revision');
const { getWeeklyKaddishEntries, getKaddishWeek } = require('./weekly-kaddish');
const {
  getPeopleWithYahrzeitToday,
  getDayKeyInTimezone,
  resolveSynagogueTimezone,
  resolveYahrzeitOptions,
} = require('./yahrzeit');

function buildYahrzeitTodayScope(synagogue, now = new Date()) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const options = resolveYahrzeitOptions(synagogue);
  return {
    dayKey: getDayKeyInTimezone(timezone, now),
    // 1.30.0 I10: the board calendar changes who counts, so it is part of the revision.
    peopleRevision: `${computePeopleRevision(synagogue && synagogue.people)}${options.boardCalendar === 'hebrew' ? ':hebrew' : ''}`,
    includeHebrewYahrzeit: options.includeHebrewYahrzeit !== false,
  };
}

function buildWeeklyKaddishScope(synagogue, now = new Date()) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const options = resolveYahrzeitOptions(synagogue);
  const week = getKaddishWeek(timezone, now);
  return {
    weekKey: week.weekKey,
    // 1.30.0 I10: the board calendar changes who counts, so it is part of the revision.
    peopleRevision: `${computePeopleRevision(synagogue && synagogue.people)}${options.boardCalendar === 'hebrew' ? ':hebrew' : ''}`,
    includeHebrewYahrzeit: options.includeHebrewYahrzeit !== false,
  };
}

function snapshotMatches(scope, stored) {
  if (!scope || !stored) {
    return false;
  }
  return stored.peopleRevision === scope.peopleRevision
    && stored.includeHebrewYahrzeit === scope.includeHebrewYahrzeit;
}

function readYahrzeitTodayCount(synagogue, scope) {
  const stored = synagogue && synagogue.adminYahrzeitTodayCache;
  if (!stored || stored.dayKey !== scope.dayKey || !snapshotMatches(scope, stored)) {
    return null;
  }
  const count = Number(stored.count);
  return Number.isFinite(count) ? count : null;
}

function readWeeklyKaddishPayload(synagogue, scope, now = new Date()) {
  const stored = synagogue && synagogue.adminWeeklyKaddishCache;
  if (!stored || stored.weekKey !== scope.weekKey || !snapshotMatches(scope, stored)) {
    return null;
  }
  if (!Array.isArray(stored.entries)) {
    return null;
  }
  const timezone = resolveSynagogueTimezone(synagogue);
  const week = getKaddishWeek(timezone, now);
  return {
    ...week,
    weekStartKey: stored.weekStartKey || week.weekKey,
    weekEndKey: stored.weekEndKey,
    entries: stored.entries,
    missingCount: Number(stored.missingCount) || 0,
  };
}

function persistYahrzeitTodayCount(slug, scope, count) {
  if (!slug) {
    return;
  }
  Synagogue.updateOne({ slug }, {
    $set: {
      adminYahrzeitTodayCache: {
        dayKey: scope.dayKey,
        peopleRevision: scope.peopleRevision,
        includeHebrewYahrzeit: scope.includeHebrewYahrzeit,
        count,
        computedAt: new Date(),
      },
    },
  }).catch(() => {});
}

function persistWeeklyKaddish(slug, scope, weeklyKaddish) {
  if (!slug || !weeklyKaddish) {
    return;
  }
  Synagogue.updateOne({ slug }, {
    $set: {
      adminWeeklyKaddishCache: {
        weekKey: scope.weekKey,
        peopleRevision: scope.peopleRevision,
        includeHebrewYahrzeit: scope.includeHebrewYahrzeit,
        weekStartKey: weeklyKaddish.weekStartKey,
        weekEndKey: weeklyKaddish.weekEndKey,
        missingCount: weeklyKaddish.missingCount,
        entries: weeklyKaddish.entries,
        computedAt: new Date(),
      },
    },
  }).catch(() => {});
}

function clearAdminYahrzeitPersistedCaches(slug) {
  if (!slug) {
    return;
  }
  Synagogue.updateOne({ slug }, {
    $unset: {
      adminYahrzeitTodayCache: 1,
      adminWeeklyKaddishCache: 1,
    },
  }).catch(() => {});
}

function resolveYahrzeitTodayCount(synagogue, now = new Date()) {
  const scope = buildYahrzeitTodayScope(synagogue, now);
  const cached = readYahrzeitTodayCount(synagogue, scope);
  if (cached != null) {
    return cached;
  }
  const count = getPeopleWithYahrzeitToday(synagogue, now).length;
  const slug = synagogue && synagogue.slug;
  if (slug) {
    persistYahrzeitTodayCount(slug, scope, count);
  }
  return count;
}

function resolveWeeklyKaddishEntries(synagogue, now = new Date()) {
  if (!synagogue || synagogue.weeklyKaddishReminderEnabled !== true) {
    const week = getWeeklyKaddishEntries(synagogue || {}, now);
    return { ...week, entries: [], missingCount: 0 };
  }
  const scope = buildWeeklyKaddishScope(synagogue, now);
  const cached = readWeeklyKaddishPayload(synagogue, scope, now);
  if (cached) {
    return cached;
  }
  const weeklyKaddish = getWeeklyKaddishEntries(synagogue, now);
  const slug = synagogue && synagogue.slug;
  if (slug) {
    persistWeeklyKaddish(slug, scope, weeklyKaddish);
  }
  return weeklyKaddish;
}

module.exports = {
  buildYahrzeitTodayScope,
  buildWeeklyKaddishScope,
  readYahrzeitTodayCount,
  readWeeklyKaddishPayload,
  resolveYahrzeitTodayCount,
  resolveWeeklyKaddishEntries,
  clearAdminYahrzeitPersistedCaches,
};
