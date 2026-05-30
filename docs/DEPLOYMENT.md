# Deployment notes

## Stable backup (before SPA migration)

If you need the previous full-page navigation version:

- Branch: `backup/pre-spa-migration`
- Git tag: `stable-pre-spa`

```bash
git checkout backup/pre-spa-migration
npm install
npm run build:board   # optional; old version used browserify at runtime
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

Built assets are served from `/board/assets/`.

API for refreshing board data without reload:

`GET /s/:slug/api/board`

## Access from Russia

Cloudflare tunnels (`trycloudflare.com`) and many Western CDNs are often blocked or throttled in Russia. See **[DEPLOYMENT-RU.md](./DEPLOYMENT-RU.md)** for Amvera (Moscow) and Docker on a Russian VPS.
