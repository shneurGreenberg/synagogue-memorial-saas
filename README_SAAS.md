# Synagogue Memorial SaaS Platform

## Overview
This project has been transformed from a static single-tenant application into a multi-tenant SaaS platform. It allows multiple synagogues to manage their own memorial boards, settings, and languages.

## Features
- **Multi-tenancy:** Access different synagogues via `/s/:slug` (e.g., `/s/novosibirsk`, `/s/moscow`).
- **Admin Panel:** Manage people, settings, and languages at `/admin`.
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
    ```

3.  **Seed Database:**
    Import the initial data (Novosibirsk):
    ```bash
    node scripts/seed.js
    ```

4.  **Run:**
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

## Deployment
This app is ready for deployment on platforms like Render, Vercel, or Heroku.
- Ensure `MONGODB_URI` is set in the production environment.
- Ensure `NODE_ENV` is set to `production`.

## Architecture
- **Backend:** Node.js, Express, Mongoose.
- **Frontend:** React (rendered via Handlebars/Browserify), SASS.
- **Database:** MongoDB.
