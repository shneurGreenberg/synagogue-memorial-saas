# Site-wide performance (v1.9.2)

Scope: public board API, Android/sidebar endpoints, admin/master routes, indexes, startup. Behavior kept identical unless noted.

## Ranked findings (impact → effort)

| Rank | Finding | Fix | Measured |
|------|---------|-----|----------|
| 1 | **Master `/master/communities` loaded every synagogue with full `people[]`** (biographies, contacts, etc.) | `loadMasterCommunitiesList()` aggregation — dashboard fields only, no people | Synthetic: one community with 500×2KB bios ≈ **1.05 MB** full doc vs **~97 B** master row (people array alone ≈ **1.05 MB**). **Not measured** against live MongoDB. |
| 2 | **Polling `/api/board/version` always returned 200** | `ETag` + `If-None-Match` → **304** when version unchanged (same as `/api/board`) | **Not measured** (needs running server + seeded slug). |
| 3 | **Android/sidebar `GET /api/sidebar-app` always full JSON** | Stable `ETag` (hash of payload **excluding** `updatedAt`) + **304** support | Unit: etag stable when only `updatedAt` changes. End-to-end latency **not measured**. |
| 4 | **Weather + jewish-content pulled full board document** | `loadSynagogueLite` / `loadSynagogueLocation` — `slug`, `location`, `language` only | **Not measured** on DB wire; logic-only. |
| 5 | **Board DB reads included admin-only blobs and per-person biography text** | `applyBoardSynagogueProjection` (drops admin/saved-view noise, `-people.text` by default); `loadPeopleTextFingerprint` + `__peopleTextFingerprint` keeps **content version** correct when only bios change; `slim=0` / person API load text on demand | Extra lean query for text fingerprint on cold cache miss. `bench-board-payload.js` with only admin-field stripping: **~0.1%** smaller JSON for 500 people; real bio-heavy DB saves more. |
| 6 | **Admin contact mutations loaded full synagogue** | `.select('contactDirectory').lean()` + `invalidateAdminSynagogueCache` | **Not measured**. |
| 7 | **Startup loaded `sharp` via photo-resize at boot** | Lazy `require('./lib/photo-resize')` inside `/photos/:filename?w=` handler | **Not measured** (cold start varies by host). |
| 8 | **Compression / static caching** | Already present: `compression()` in `app.js`; hashed board assets `immutable` in production; `/photos?w=` resized responses `Cache-Control: public, max-age=604800, immutable`; static `/photos` uses `etag` + `lastModified` (not `immutable` — filenames can be reused) | `scripts/bench-admin.js` needs live server — **not run** (disk/scope). |

## MongoDB indexes

- `Synagogue.slug`: `unique: true` (index exists via Mongoose).
- No new indexes added; no slow-query log analysis in this pass.

## Before / after numbers (local, no DB)

Command: `node scripts/bench-board-payload.js 500` (7-run median for `computeBoardVersion`).

| Metric | Before (full synthetic doc) | After (board projection strip) |
|--------|----------------------------|--------------------------------|
| Document JSON bytes | 365 331 | 365 082 |
| Public slim API JSON | 92 627 | 92 627 |
| `computeBoardVersion` median | ~1.38 ms | ~1.40 ms |

Command: synthetic master list (500 people × 2 000 char `text` per person, inline node snippet in audit).

| Metric | Before (`find({}).lean()`) | After (aggregation) |
|--------|---------------------------|---------------------|
| Per-community payload (JSON order-of-magnitude) | ~1.05 MB | ~100 B + metadata |

## Android / sidebar endpoints

| Endpoint | Treatment |
|----------|-----------|
| `GET /s/:slug/api/sidebar-app` | Board load uses projection; **ETag / 304** |
| `GET /s/:slug/api/board/version` | **ETag / 304** |
| `GET /s/:slug/api/weather` | Lite location load |
| `GET /s/:slug/api/board` | Unchanged (already ETag); board load projection |
| `POST .../api/board/presence` | Already lean query (`boardClients`, `publishedVersion`) |

## Tooling

- `scripts/bench-board-payload.js` — synthetic payload sizes + version hash timing (no MongoDB).

## Not measured in this pass

- HTTP latency under load, MongoDB `explain()`, production CDN, gzip ratio on real board JSON, full `npm test` smoke (MongoDB).
