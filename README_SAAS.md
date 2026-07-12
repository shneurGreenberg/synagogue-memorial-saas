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
