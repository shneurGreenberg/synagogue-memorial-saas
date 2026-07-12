# Deployment notes

## Stable backup (before SPA migration)

If you need the previous full-page navigation version:

- Branch: `backup/pre-spa-migration`
- Git tag: `stable-pre-spa`

```bash
git checkout backup/pre-spa-migration
npm install
npm run build:board   # Vite SPA build into public/board/
node app.js
```

## Memorial board SPA (current)

The public memorial board is a **Vite + React + React Router** single-page app. Data is embedded once in the HTML; navigation between tiles and person detail is client-side (no full page reload).

Build before starting the server (or after UI changes):

```bash
npm install
npm run build:board
node app.js
```

`build:board` automatically bumps `board-version.json` so TVs and browsers fetch fresh `/board/assets/memorial.js?v=…` after each deploy. If you deploy without running `build:board`, viewers may keep an old cached bundle.

Built assets are served from `/board/assets/`.

API for refreshing board data without reload:

`GET /s/:slug/api/board`

## Access from Russia

Cloudflare tunnels (`trycloudflare.com`) and many Western CDNs are often blocked or throttled in Russia. See **[DEPLOYMENT-RU.md](./DEPLOYMENT-RU.md)** for Amvera (Moscow) and Docker on a Russian VPS.
