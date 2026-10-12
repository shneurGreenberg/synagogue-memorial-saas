# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **Synagogue Memorial Board SaaS Platform** (Node.js/Express + MongoDB + Vite/React board SPA + Handlebars admin). It allows multiple synagogues to manage digital memorial boards.

### Services

| Service | How to run |
|---------|-----------|
| MongoDB | `sudo mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork` |
| App server | `node app.js` (runs on port 3000 by default) |

### Environment setup

A `.env` file is required at the project root (gitignored). Minimum contents:

```
MONGODB_URI=mongodb://localhost:27017/synagogue
SESSION_SECRET=dev_secret_key_12345
PORT=3000
MASTER_ADMIN_PASSWORD=masteradmin
```

In production, `SESSION_SECRET` and `MASTER_ADMIN_PASSWORD` are required (startup fails if missing/default). Prefer a bcrypt hash for `MASTER_ADMIN_PASSWORD`.

### Seeding

Run `node scripts/seed.js` to seed the Novosibirsk synagogue (skips if already exists). Default admin credentials: slug=`novosibirsk`, password=`admin`.

### Key commands

- **Run app:** `node app.js`
- **Seed DB:** `node scripts/seed.js`
- **Install deps:** `npm install`
- **Build board SPA:** `npm run build:board`
- **Prebuild CSS:** `npm run build:css`
- **Tests:** `npm test` (unit + HTTP smoke; needs MongoDB and seeded `novosibirsk`)

### Gotchas

- MongoDB must be running before starting the app; it will fail to connect otherwise.
- There is no separate linter. Smoke tests use Node's built-in test runner (`node --test`).
- The public memorial board is a Vite-built React SPA in `public/board/` (source: `client/`). Rebuild with `npm run build:board` after client changes.
- Admin/master UIs are Handlebars + vanilla JS in `views/` and `public/js/`.
- Uploaded photos go to `photos/` and images to `images/` on the local filesystem (or `/data` when persistent storage is configured).
- Master wizard uploads live in `provisioning/` and are served at `/images/provisioning/...`.
- Public board APIs intentionally omit contacts, admin users, and other private fields.
- `pm2` scripts in `package.json` (`yarn restart`/`yarn stop`) are for production only; use `node app.js` for development.

### Changelog (required for every code change)

Every code change (feature, fix, or behavior change) **must** add an entry to `CHANGELOG.json` at the repo root:
- Newest version first: `{ "version": "X.Y.Z", "date": "YYYY-MM-DD", "items": [{ "type": "added|fixed|changed", "text": "<Hebrew description>" }] }`.
- Bump the version above the current head (the head version is the app code version shown in admin).
- When the deployed code version is newer than a community's `lastRefreshedCodeVersion`, the tenant admin dashboard shows a "new version" banner with details (this changelog) and a refresh button. Pressing refresh ("רענן מסך תצוגה") force-reloads that community's screens and records the version.
- Admin design/settings changes are not code versions and must not be added here.
- `test/changelog.test.js` validates the file format.
