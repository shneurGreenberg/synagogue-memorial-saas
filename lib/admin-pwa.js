'use strict';
// 1.31.3 I31(1): the admin area can be installed as an app (PWA).
// The service worker never caches admin pages, API responses or hashed assets: every request goes
// to the network as before; only a tiny offline notice page is kept for when there is no connection.

const ADMIN_MANIFEST = {
  name: 'Kaddish Admin',
  short_name: 'Kaddish',
  description: 'Synagogue memorial board admin',
  start_url: '/admin/?source=pwa',
  id: '/admin/',
  scope: '/admin/',
  display: 'standalone',
  background_color: '#1f1f24',
  theme_color: '#1f1f24',
  icons: [
    { src: '/images/admin-pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/images/admin-pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/images/admin-pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

const OFFLINE_HTML = '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>'
  + '<body style="font-family:sans-serif;background:#1f1f24;color:#f2f2f2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center">'
  + '<div><h1>אין חיבור לאינטרנט</h1><p>No internet connection · Нет подключения</p></div></body></html>';

const SW_VERSION = 'admin-sw-v2';

const SERVICE_WORKER_JS = `/* ${SW_VERSION} */
const OFFLINE_CACHE = '${SW_VERSION}';
const OFFLINE_URL = '/admin-offline.html';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((c) => c.add(new Request(OFFLINE_URL, { cache: 'reload' }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Network only. Only full-page navigations get the offline notice when the network fails.
  if (req.mode !== 'navigate' || req.method !== 'GET') return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});
`;

function registerAdminPwa(app) {
  app.get('/admin-manifest.webmanifest', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(JSON.stringify(ADMIN_MANIFEST));
  });
  app.get('/admin-sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Service-Worker-Allowed', '/admin/');
    res.send(SERVICE_WORKER_JS);
  });
  app.get('/admin-offline.html', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(OFFLINE_HTML);
  });
}

module.exports = { registerAdminPwa, ADMIN_MANIFEST, SERVICE_WORKER_JS };
