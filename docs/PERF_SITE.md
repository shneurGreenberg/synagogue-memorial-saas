# Site-wide performance (board + APIs)

Scope: public memorial board SSR, `/s/:slug/api/*`, favicon, and shared caches. Admin yahrzeit work is documented in `docs/PERF_1.9.1.md`.

## Root causes addressed

1. **Full synagogue documents on every board load** — MongoDB returned admin-only blobs (`savedViews` screenshots, `contactDirectory`, `boardClients`, weekly Kaddish state, large `people.text` / contacts) even though the public board never exposes them.
2. **Repeated CPU on hot paths** — `computeBoardVersion` (SHA over large JSON) and `buildYahrzeitEntries` ran on every SSR/API hit despite a 5-minute in-memory board cache.
3. **Heavy satellite routes** — Weather and Jewish content loaded the full board document only to read `location` / timezone.
4. **Favicon** — `sharp` resized the community logo on every favicon request.

## Changes (v1.9.2)

| Area | Change |
|------|--------|
| `lib/board-synagogue-projection.js` | Lean `select()` for board loads; keeps `yahrzeitReminders.includeHebrewYahrzeit` for correct yahrzeit behavior |
| `lib/board-people-text.js` | Text fingerprint for ETag when biographies are not loaded; `$elemMatch` load for person API |
| `lib/load-synagogue-board.js` | Projection + fingerprint; `includePeopleText` for `?slim=0`; `loadSynagogueLite` for location/lang |
| `lib/board-cache.js` | Reuse stored `contentVersion`; invalidate yahrzeit compute cache with board cache |
| `app.js` | Cached yahrzeit count + content version; ETag helper on board JSON; lean routes for weather/jewish-content |
| `lib/favicon.js` | In-memory PNG cache keyed by logo mtime |
| `lib/admin-yahrzeit-cache.js` | Count via `getPeopleWithYahrzeitToday` (no URL mapping) |

## Behavior notes

- Board **ETag / version** still changes when biography text changes (fingerprint query on cache miss).
- **Person API** loads biography text in a second query only when needed.
- **`?slim=0`** bypasses the text-stripped cache entry and loads people text from MongoDB.

## Observability

- Admin yahrzeit: `ADMIN_TIMING=1` (see `docs/PERF_1.9.1.md`).
- Local benches: `scripts/bench-admin.js`, `scripts/bench-yahrzeit.js`.
