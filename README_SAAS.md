# Synagogue Memorial SaaS Platform

## Overview
This project has been transformed from a static single-tenant application into a multi-tenant SaaS platform. It allows multiple synagogues to manage their own memorial boards, settings, and languages.

## Features
- **Multi-tenancy:** Access different synagogues via `/s/:slug` (e.g., `/s/novosibirsk`, `/s/moscow`).
- **Admin Panel:** Manage people, settings, and languages at `/admin`.
- **Master Panel:** Provision new synagogues at `/master`.
- **Localization:** Supports English, Russian, and Hebrew.
- **Theming:** Customize title and primary colors.
- **MongoDB:** Data is stored in MongoDB for scalability.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

2.  **Environment Variables:**
    Create a `.env` file:
    ```
    MONGODB_URI=mongodb://localhost:27017/synagogue
    SESSION_SECRET=your_secret_key
    PORT=3000
    MASTER_ADMIN_PASSWORD=masteradmin
    ```

3.  **Seed Database:**
    Import the initial data (Novosibirsk):
    ```bash
    node scripts/seed.js
    ```

4.  **Build board assets (after client changes):**
    ```bash
    npm run build:board
    npm run build:css
    ```

5.  **Run:**
    ```bash
    node app.js
    # or
    npm start
    ```

## Usage

- **Public Board:** Go to `http://localhost:3000/s/novosibirsk`
- **Admin Panel:** Go to `http://localhost:3000/admin/login`
    - **Slug:** `novosibirsk`
    - **Password:** `admin` (Default from seed script)
- **Master Panel:** Go to `http://localhost:3000/master/login`
    - **Password:** value of `MASTER_ADMIN_PASSWORD`
- **Gravestone scan (staff):** `http://localhost:3000/s/novosibirsk/scan`
    - Sign in with the synagogue admin account. The page is Russian-first and meant for a phone at the cemetery.
    - Photograph a stone, check the card, then save. The photo and person are stored with the same fields the memorial board already uses (`name`, `gregorianDateOfDeath`, `text`, `photo`).

## Gravestone OCR

Staff route: `GET /s/{slug}/scan`. Reading a photo is `POST /s/{slug}/api/scan-grave`. Confirming the card is `POST /s/{slug}/api/scan-grave/confirm`.

Set these in `.env` (never commit keys):

```
GRAVE_OCR_PROVIDER=openrouter
OPENROUTER_API_KEY=
GRAVE_OCR_MODEL=deepseek/deepseek-v4.1-flash
```

`openrouter` is the default provider. `deepseek/deepseek-v4.1-flash` is the current DeepSeek model on OpenRouter with native image input. Do not point `GRAVE_OCR_MODEL` at the text-only alias `~deepseek/deepseek-v4-flash-latest`.

To switch provider, set `GRAVE_OCR_PROVIDER` to `deepseek` or `gemini` and the matching key (`DEEPSEEK_API_KEY` or `GEMINI_API_KEY`). The app does not fall back to another provider when a call fails. Without a key, the scan page still opens a manual card so the photo can be saved.

## Deployment

| Mode | Provider | Russia | Backend |
|------|----------|--------|---------|
| Free board only | GitHub Pages | partial | no |
| Free start + full app | **Amvera** + MongoDB Atlas M0 | yes | yes |

See **[docs/FREE-RU-PROVIDER.md](docs/FREE-RU-PROVIDER.md)** (Russian guide) and **[providers.yml](providers.yml)**.

- **Russia:** use Amvera (`amvera.yaml`), not Cloudflare tunnels or Render.
- Set `MONGODB_URI`, `SESSION_SECRET`, `MASTER_ADMIN_PASSWORD`, `NODE_ENV=production`, `TRUST_PROXY=1` in production.
- Production refuses to start with missing/default secrets.

## Architecture
- **Backend:** Node.js, Express, Mongoose.
- **Public board:** Vite + React SPA (`client/` → `public/board/`).
- **Admin/master:** Handlebars + vanilla JS.
- **Database:** MongoDB.
- **Public API contract:** Board payloads are projected through `lib/public-board.js` so contacts, admin users, and reminder emails never reach TVs/browsers.
