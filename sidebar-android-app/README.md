# Kaddish Sidebar — Android App

Standalone Android app that mirrors the **right sidebar** of the synagogue memorial board:

- Live clock (based on device location)
- Hebrew and Gregorian dates
- Weekly Torah portion (parsha)
- Shabbat entry / exit times
- Weather and sunrise/sunset
- Scrolling upcoming Jewish dates and community announcements
- **No QR code**

## Sync with the memorial board

When configured with your server URL and synagogue slug, the app loads data from:

```
GET /s/{slug}/api/sidebar-app?lang=ru
```

Any community event you add in the admin panel (`/admin/{slug}/events`) appears in the app automatically (polls every 30 seconds).

### Example settings

| Field | Example |
|-------|---------|
| Server URL | `https://your-domain.com` |
| Synagogue slug | `novosibirsk` |
| Language | `ru` / `en` / `he` |

## Standalone mode

Without a server, the app still works using:

- Device GPS for time, Shabbat, and weather
- Hebcal + Open-Meteo directly
- **Local announcements** (Settings → Local announcements) stored on the device

## Development

```bash
cd sidebar-android-app
npm install
npm run dev
```

Open the Vite dev URL in a browser.

## Build Android APK

Requirements: Node.js 18+, Android Studio, JDK 17.

```bash
npm install
npm run build
npx cap add android   # first time only
npm run cap:sync
npm run cap:open
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Or from CLI:

```bash
npm run android:build
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Download ready APK

If your server is deployed with this repo, download:

```
https://YOUR-SERVER/downloads/kaddish-sidebar.apk
```

## Home screen widget (Android)

1. Open the app once and save your settings (server + slug + location permission).
2. Long-press the home screen → **Widgets** → **Kaddish Sidebar**.
3. Place the widget on your home screen.

The widget shows clock, dates, parsha, Shabbat times, weather, and the next announcement. It refreshes automatically and syncs when you open the app.

## Permissions

The Android app requests:

- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — for local time, Shabbat, and weather

## Project structure

```
sidebar-android-app/
  src/
    App.jsx                 Main screen
    components/             Clock, Shabbat, weather, scrolling list
    lib/                    Dates, weather, sync, settings
  capacitor.config.json
```

## Server changes (main repo)

The main `synagogue-memorial-saas` server adds:

- `GET /s/:slug/api/sidebar-app` — consolidated sidebar payload
- CORS headers on `/api/*` routes for mobile clients

## Admin workflow (recommended)

1. Add community events in the existing admin: `/admin/{slug}/events`
2. Install the Android app and enter the same server + slug
3. Events sync automatically to the scrolling list

Local device-only announcements are available as a fallback in app settings.
