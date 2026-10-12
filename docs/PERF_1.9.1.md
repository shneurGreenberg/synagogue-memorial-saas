# Admin yahrzeit performance (v1.9.1)

Environment: local Node benchmark `node scripts/bench-yahrzeit.js 500`, 7 runs, median reported.  
Synthetic dataset: 500 people with death dates, contacts, optional biography text (not loaded on yahrzeit profile).

## Root cause

`GET /admin/:slug/yahrzeit` (and every admin page via `renderAdmin`) recomputed yahrzeit lists on each request:

- **Weekly Kaddish list**: O(7 × N) scans with `hebcal` `HDate` construction per person per day (~668 ms for N=500).
- **Missed yahrzeits this week**: another O(7 × N) pass plus today's scan (~776 ms).
- **Nav badge** (`yahrzeitTodayCount`): full `buildYahrzeitEntries` on every admin page (~176 ms).
- **DB**: `people` profile included `people.text` (biography) even though the yahrzeit template does not need it.

Hebrew death-date conversion was repeated for the same civil date on every check.

## Before (no cache, no death-date memo, original weekly algorithm)

| Step | Median (ms) |
|------|-------------|
| `buildYahrzeitEntries` (nav count) | 176.28 |
| `buildYahrzeitPageEntries` | 169.25 |
| `buildYahrzeitWeekMissedEntries` | 776.54 |
| `getWeeklyKaddishEntries` | 668.34 |

## After (death-date memo + weekly scan fix + per-synagogue compute cache + yahrzeit DB projection)

| Step | Median (ms) | Notes |
|------|-------------|--------|
| `buildYahrzeitEntries` (nav count) | 119.40 | Same code path; faster from shared `HDate` cache |
| `buildYahrzeitPageEntries` | 116.29 | |
| `buildYahrzeitWeekMissedEntries` | 126.95 | |
| `getWeeklyKaddishEntries` | 2.15 | Single pass per person over 7 days |
| `getCachedAdminYahrzeitBundle` (cold) | ~248 | One combined compute per scope (page + week + weekly + count) |
| `getCachedAdminYahrzeitBundle` (warm) | ~0.002 | In-memory hit; invalidates with admin synagogue cache |

Warm/cold bundle from `USE_CACHE=1 node scripts/bench-yahrzeit.js 500` on the same machine.

## Changes

- `lib/admin-yahrzeit-cache.js` — cache bundle keyed by slug, civil day, week, people revision, Hebrew-yahrzeit flag, admin language; 15s TTL aligned with admin synagogue cache.
- `lib/yahrzeit-death-hebrew.js` — memoize `HDate` for death civil dates and week days.
- `lib/weekly-kaddish.js` — one pass per person for the current week.
- `lib/admin-synagogue-load.js` — `yahrzeit` projection (no `people.text`); yahrzeit compute cache cleared in `invalidateAdminSynagogueCache`.
- `routes/admin.js` — yahrzeit route uses cache + `ADMIN_TIMING` / `Server-Timing` segments (`db`, `compute`, `holiday`, `render`).
- `scripts/bench-yahrzeit.js` — local CPU benchmark (no MongoDB).

## Observability

Set `ADMIN_TIMING=1` to log and emit `Server-Timing` for the yahrzeit admin route.
