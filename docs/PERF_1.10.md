# Admin & board compute caching (v1.10)

Scope: admin navigation, yahrzeit/weekly Kaddish, Hebrew death dates, jewish-feed side work. Builds on v1.9.1 in-memory admin yahrzeit cache and v1.9.2 board projections.

## Ranked per-request work (impact → mitigation)

| Area | Before | Mitigation | Invalidation |
|------|--------|------------|--------------|
| **Nav badge** `yahrzeitTodayCount` on every `renderAdmin` / board SSR | O(N) yahrzeit scan per request (15s in-memory cache only) | MongoDB snapshot `adminYahrzeitTodayCache` keyed by civil `dayKey` + `peopleRevision` + Hebrew-yahrzeit flag; still wrapped in 15s in-memory cache | `invalidateAdminSynagogueCache` clears snapshot + memory |
| **Weekly Kaddish list** (missing-contact flags) | Recomputed on each yahrzeit page load | `adminWeeklyKaddishCache` keyed by `weekKey` (Sunday start) + revision + Hebrew flag | Same as people/contact edits |
| **Hebrew death date** | `hebcal` `HDate` per check via in-process memo | Persist `people.hebrewDateOfDeath` on save; lazy backfill on admin people/yahrzeit reads; memo remains hot-path cache | Death date edit clears stored Hebrew |
| **Admin holiday notice** (yahrzeit/events) | `getUpcomingHolidays` per request | In-memory cache per `lang` + civil day (6h TTL) | Day rollover |
| **Board payload** | Document + version hash | Unchanged from v1.9.2: projection, ETag, `board-cache` | Publish/mutation hooks |
| **Zmanim / parsha / holidays (board sidebar)** | `jewish-feed` per slug/day | Existing `jewish-feed` in-memory day cache; sidebar API ETag | Day key |
| **Yahrzeit page bundle** (today + missed week + weekly) | Single in-memory bundle per scope (v1.9.1) | Unchanged; weekly segment reads DB snapshot when warm | Revision + week/day |

## Hebrew death date persistence

- `lib/person-hebrew-death.js` — compute/store `{ month, date, year }` from civil death date.
- `lib/yahrzeit.js` — Hebrew yahrzeit checks use stored value when present (`getHebrewHDateForPerson`).
- `lib/person-hebrew-backfill.js` — fire-and-forget `$set` for legacy rows missing Hebrew fields.

## Weekly missing-contacts alert

- Persisted entries include `missingContact` per person (same shape as `getWeeklyKaddishEntries`).
- `people-revision` now includes contact fields (and internal notes length) so contact edits invalidate snapshots.

## Not measured in this pass

- End-to-end admin page latency with MongoDB under load.
- Cold vs warm `adminWeeklyKaddishCache` on production-sized communities.
- Full `npm test` smoke (requires seeded MongoDB).

## Tooling

- `scripts/bench-yahrzeit.js` — still valid for CPU-side yahrzeit/weekly work (no DB snapshots).
- `ADMIN_TIMING=1` — yahrzeit route `Server-Timing` segments unchanged.
