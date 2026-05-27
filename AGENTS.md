# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **Synagogue Memorial Board SaaS Platform** (Node.js/Express + MongoDB + React via Browserify). It allows multiple synagogues to manage digital memorial boards.

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

### Seeding

Run `node scripts/seed.js` to seed the Novosibirsk synagogue (skips if already exists). Default admin credentials: slug=`novosibirsk`, password=`admin`.

### Key commands

- **Run app:** `node app.js`
- **Seed DB:** `node scripts/seed.js`
- **Install deps:** `npm install`

### Gotchas

- MongoDB must be running before starting the app; it will fail to connect otherwise.
- There is no linter, test framework, or build step configured in `package.json`. The app compiles SCSS and bundles React/JSX on-the-fly at runtime.
- Uploaded photos go to `photos/` and images to `images/` on the local filesystem.
- The `express-browserify` package compiles JSX on first request, so the first page load of `/s/:slug` is slow (~5s).
- `pm2` scripts in `package.json` (`yarn restart`/`yarn stop`) are for production only; use `node app.js` for development.
