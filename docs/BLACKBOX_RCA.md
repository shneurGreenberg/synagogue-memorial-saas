# Black box over right sidebar clock (TV browsers) — root cause analysis

**Symptom:** On live memorial boards (especially weak Android TV / old Chromium), the top of the right column (`.board-right-header` / `.board-clock-block`: `LiveClock`, Hebrew/Gregorian dates, weekly parsha in `.board-shabbat-block`) renders correctly after refresh, then after **several hours** a **solid black rectangle** covers that region. Refresh clears it temporarily.

**Scope:** Client board SPA (`client/`), styles (`styles/home.scss`, `styles/common.scss`, `styles/_css-candle.scss`). No server deploy investigated.

**Method:** Static code review, `git log -S` / blame on suspects, timer/overlay audit, Node unit tests (`test/blackbox-right-header-rca.test.js`). Headless Playwright/Puppeteer not available in `..\repo\node_modules`; repro script documents TV/DevTools steps.

---

## Layout reference

Right column structure (`client/src/pages/HomePage.jsx`):

1. `.board-official-logo` (optional)
2. `.board-clock-block` → `LiveClock` + `formatHebrewDate` / `formatGregorianDate` from `HomePage` state
3. `.board-shabbat-block` → `ShabbatTimes`
4. `.board-weather-block` → `BoardWeatherSection` (if enabled)
5. `.right-panel-scroll` → daily cite + `SidebarUpcomingPanel`

The clock block is **not** wrapped in `.golden-panel`; only center-grid `.card` tiles use glass + `backdrop-filter` (`MemorialCard.jsx` + `memorial-tile-glass` mixin).

Fixed UI that can sit over the **viewport** top-right (Hebrew boards):

- `.baruch-hashem-badge` — `position: fixed`, `z-index: 950`; Hebrew UI moves it to physical top-right (`styles/home.scss` ~2144–2149, `styles/common.scss` ~243–256). **Text only, no background** — overlap, not a black box, unless mis-reported region.
- `.board-version` — top center (`z-index: 950`).
- `.board-lang-toggle` — bottom-right (`z-index: 900`), dark circle not full header.
- `PresentationImageOverlay` / `.slideshow-overlay` — full viewport `#000` (`z-index: 20000` / `1000`) when slideshow/presentation enabled.

---

## What changes on a multi-hour timeline

| Cadence | Mechanism | Files | Black-box plausibility |
|--------|-----------|-------|-------------------------|
| 1 s | `LiveClock` `setInterval` tick | `client/src/components/LiveClock.jsx:17–29` | Low alone; adds repaint pressure next to heavy GPU layers |
| 60 s | Calendar day check | `client/src/lib/board-calendar.js:88` | Low (state refresh at Gregorian midnight) |
| 8 s / 60 s | Board data poll | `client/src/context/BoardDataContext.jsx:28–29, 235–240` | Low unless theme key churn remounts `<style>` |
| 1 h | Weather `setInterval` | `client/src/lib/weather-forecast.js:4, 206` | Low (panel below clock; loading/unavailable is semi-transparent) |
| 1 h | `ShabbatTimes` hourly `setInterval` + sunset/havdalah `setTimeout` | `client/src/components/ShabbatTimes.jsx:27–43`, `lib/shabbat-times.js:332–346` | Low (text reflow) |
| 1 h | Jewish feed / sidebar refresh | `SidebarUpcomingPanel.jsx:9, 243`, `JewishContentPanels.jsx:50` | Low |
| Slideshow interval | Full-screen overlay | `PresentationImageOverlay.jsx` | **Medium** if enabled and `document.hidden` edge case (see #4) |
| Continuous | 16× `backdrop-filter: blur(8px)` on cards + 16× animated candles (`will-change`) on TV | `common.scss:57–68`, `_css-candle.scss:60, 176`, `legacy-browser.js:43–50` | **High** (GPU tile exhaustion) |
| Continuous | `body { background-attachment: fixed }` | `ThemeStyles.jsx:298–305` | **Medium–High** on Android WebView/TV Chromium |

**Refresh fixes symptom** → strongly favors **GPU/compositor corruption** or **stuck full-screen layer**, not wrong Hebrew date text.

---

## Ranked root-cause candidates

### 1. (Most likely) GPU compositor tile failure: `backdrop-filter` × memorial grid + `will-change` candle animations on “low power” TVs

**Evidence**

- Sixteen `.card.golden-panel` tiles each use `memorial-tile-glass` → `backdrop-filter: blur(8px)` when tile transparency &gt; 0 (`styles/common.scss:57–68`, duplicated in `ThemeStyles.jsx:329–343` for `.golden-panel`).
- TV / SmartTV UA is classified as low-power (`legacy-browser.js:8–10`) but **no longer** gets static candles since commit `dcde0a8` (2026-10-14, pre–v1.16): `resolveBoardCandleMode()` returns `'lite'` on TV, not `'static'`.
- `dcde0a8` added `will-change: transform, opacity` on `.css-candle-flame` and `.css-candle-lite` (`styles/_css-candle.scss:60, 176`) — **16 promoted layers** animating indefinitely.
- Prior behavior (`b0beaf3` / #108): low-power TVs used **static** candles (`shouldUseStaticCandleOnly()` included `isLowPowerBoardBrowser()`), reducing GPU load.
- Chromium on Android TV is known to paint **black rectangles** when backdrop-filter / filter / excessive composited layers exhaust GPU memory; symptom is **time-dependent** and **cleared by reload**.
- Clock header sits in the adjacent grid column; compositor bugs often manifest as **mis-aligned tiles** over neighboring regions (top-right of right panel is a common casualty).

**Introduced / intensified:** `f41b25e` / `f016cce` (frosted glass), `2d1edde` (stronger blur), **`dcde0a8`** (animated lite + `will-change` on TVs).

**Confirm on TV**

1. Remote DevTools → when black box appears, **Inspect** at clock center: if `elementFromPoint` returns a `.card` or anonymous compositor layer (not clock DOM), it’s GPU bleed.
2. Admin: set tile opacity to **opaque** (disable glass / transparency) or temporarily disable candle animation via proposed patch — if artifact disappears after hours, confirmed.
3. `chrome://gpu` or `about:gpu` (if available): rising **GPU memory** before failure.

**Minimal fix (proposed on branch)**

- Restore **`static`** candle mode for `isLowPowerBoardBrowser()` (revert `dcde0a8` behavior for TVs).
- Skip `backdrop-filter` in `ThemeStyles` (and optionally force legacy glass) when `isLowPowerBoardBrowser()`.
- Optional: `background-attachment: scroll` on low-power (`ThemeStyles.jsx:304`).

---

### 2. `background-attachment: fixed` on full-page board background

**Evidence**

- `ThemeStyles.jsx:298–305` sets `background-attachment: fixed` on `body` with cover image.
- Long-standing Chromium/Android bug class: fixed backgrounds + composited children → **black flashes/rectangles** after long uptime.
- Introduced in theme injection path; `git log -S "background-attachment"` → `b0beaf3` (#108 performance), `544f836`.

**Confirm:** Override to `scroll` via DevTools Styles; soak test overnight.

**Fix:** Use `scroll` (or `local`) on `isLowPowerBoardBrowser()` / TV profile.

---

### 3. `content-visibility: auto` + `contain: layout` on cards interacting with compositor

**Evidence**

- `.card` uses `contain: layout`, `content-visibility: auto`, `contain-intrinsic-size` (`styles/home.scss:538–541`).
- Can cause **blank/black placeholders** in some Chromium builds when layers are recycled.

**Confirm:** Disable `content-visibility` in DevTools on `.card`; long soak.

**Fix:** Disable `content-visibility` on low-power profile.

---

### 4. `PresentationImageOverlay` stuck visible after `document.hidden` (slideshow / presentation)

**Evidence**

- When `document.hidden`, `showSlides` reschedules but **does not** call `setVisible(false)` (`PresentationImageOverlay.jsx:129–132`).
- If overlay became visible before TV standby, timers may leave a **full-screen `#000`** portal (`home.scss:2354–2385`) until next cycle.
- Would usually cover **entire** screen, not only clock — unless partial damage is mis-localized.

**Introduced:** Portal overlay path in React board (`PresentationImageOverlay.jsx`); slideshow z-index stack `home.scss:2381–2385`.

**Confirm:** Check if community has slideshow/presentation enabled; when bug shows, `document.querySelector('.slideshow-overlay, .presentation-image-overlay')`.

**Fix:** `setVisible(false)` when deferring due to `document.hidden`; pause timers on `visibilitychange`.

---

### 5. v1.16 ב״ה badge (`z-index: 950`) at physical top-right on Hebrew boards

**Evidence**

- `f918f45` / v1.16 changelog: badge uses `inset-inline-*`; Hebrew moves badge to **top-right** (`home.scss:2144–2149`, `CHANGELOG.json` 1.16.0).
- Coincides with “top-right” report on Hebrew synagogues but badge has **no background** — would obscure text, not a black rectangle.

**Confirm:** Toggle `body.board-lang-he`; see if artifact is badge-shaped text vs solid block.

---

### 6. Weather panel failure / midnight refresh

**Evidence**

- `BoardWeatherSection.jsx:140–160` renders dark-ish panels on load/fail (`rgba(0,0,0,0.22)` cards, `home.scss:991–998`).
- Panel is **below** clock in DOM order; unlikely to cover clock unless flex overlap bug.

**Confirm:** Disable weather feature; reproduce timeline.

---

### 7. `ThemeStyles` `<style key={...}>` remount on theme poll

**Evidence**

- `ThemeStyles.jsx:347–351` remounts entire CSS when theme fingerprint changes.
- `BoardDataContext` poll every 8s could bump `revision` and merge theme — usually **visible flash**, not growing black box.

**Confirm:** Log `key` changes over hours; correlate with artifact.

---

### 8. Shabbat / Hebrew date rollover at sunset (not implemented on board clock path)

**Evidence**

- `HomePage` Hebrew date uses `getHebrewDateInTimezone` only on `calendarDayKey` change (**Gregorian midnight**, `board-calendar.js`) — not sunset.
- `ShabbatTimes` uses `createHebrewDate()` without board TZ in render (`ShabbatTimes.jsx:16–17`) — wrong parsha text possible, not black overlay.

---

### 9. Listener / DOM leak accumulating overlays

**Evidence**

- Audited `addEventListener` in `client/src/**`: paired cleanup in `useEffect` returns / `componentWillUnmount` for clock, poll, weather, Shabbat, overlays.
- No pattern of unbounded portal creation except slideshow single portal.

**Likelihood:** Low unless third-party TV browser breaks `clearInterval`.

---

### 10. Idle reload / code version reload / html2canvas

**Evidence**

- `IdleReload.jsx` reloads after `reloadTimeout` — would **reset** artifact, not create it.
- `BoardDataContext` reloads on code/publish version change — same.
- **No `html2canvas`** in client board tree.

---

## Single most likely root cause

**#1 — Cumulative GPU/compositor failure from combining ~16× `backdrop-filter: blur(8px)` memorial tiles with ~16× continuously animated CSS candles using `will-change`, on browsers classified as low-power (Smart TV) but still running “lite” animation since `dcde0a8`.**  

Refresh clears GPU allocations; hours of 1 Hz clock repaints + candle animation + glass blur exhausts weak Chromium, producing a **black compositor tile** over the adjacent right-header region.

---

## How to confirm on the production TV (checklist)

1. When the box appears, connect **Chrome remote debugging** (or send photo + `adb` WebView inspect if wrapped).
2. Run in console at clock coordinates (adjust x/y to panel):
   ```js
   const r = document.querySelector('.board-clock-block')?.getBoundingClientRect();
   const el = document.elementFromPoint(r.right - 10, r.top + 10);
   ({ tag: el?.tagName, className: el?.className, id: el?.id });
   ```
3. List fixed layers:
   ```js
   [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).position === 'fixed').map(e => e.className);
   ```
4. Note: slideshow on? Hebrew UI? Glass tile transparency in saved view?
5. Soak with **static candles** test build (proposed patch) vs current build.

---

## Repro / tests in repo

- **`test/blackbox-right-header-rca.test.js`** — documents TV UA → candle mode; simulates overlay `document.hidden` deferral; asserts compositor-risk markers in source.
- **`scripts/blackbox-rca-tv-probe.js`** — pasteable DevTools probe (also embedded above).

Automated fast-forward (sinon/jsdom/playwright) was **not** run — dependencies absent in `..\repo\node_modules`. A Playwright clock test would: load `/s/:slug`, `page.clock.install`, advance 6h across local sunset, sample `elementFromPoint` on `.board-clock-block` bounding rect.

---

## Proposed minimal fix (summary)

| File | Change |
|------|--------|
| `client/src/lib/legacy-browser.js` | Export `shouldReduceBoardCompositorLoad()`; return **`static`** candles for `isLowPowerBoardBrowser()` again |
| `client/src/components/ThemeStyles.jsx` | When reducing compositor load, omit `@supports` `backdrop-filter` block; use `background-attachment: scroll` on `body` |
| `client/src/components/PresentationImageOverlay.jsx` | On `document.hidden`, `setVisible(false)` and defer reschedule |

Optional follow-up: nightly `IdleReload` or compositor-safe saved view preset for TV kiosks.

---

## Version / commit map (suspects)

| Version / commit | Change relevant to bug |
|------------------|------------------------|
| `dcde0a8` | Lite animated candles + `will-change` on TV; static only for legacy video codec |
| `f918f45` / 1.16.0 | ב״ה fixed top-right (Hebrew) |
| `f41b25e`, `f016cce`, `2d1edde` | Glass `backdrop-filter` tiles |
| `b0beaf3` (#108) | Static candles on low-power; `background-attachment: fixed`; poll optimizations |
| `PresentationImageOverlay.jsx` | Full-screen black overlays, portal to `document.body` |

---

*Report generated on branch `blackbox-rca` for offline TV black-box investigation.*
