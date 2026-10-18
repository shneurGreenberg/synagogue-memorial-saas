#!/usr/bin/env node
/**
 * Visual check for the daily study (limud) panel: bundles the REAL
 * client/src/components/JewishContentPanels.jsx with small mocks (board data,
 * feed client, i18n) and the built public/board/assets/memorial.css, then
 * screenshots scenarios with headless Chrome/Edge.
 * Usage: node scripts/render-daily-gates-static.js [label]
 * Output: ../v118-render/<label>/<scenario>.html + .png
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const label = (process.argv[2] || 'output').trim();
const outDir = path.resolve(ROOT, '..', 'v118-render', label);
fs.mkdirSync(outDir, { recursive: true });

const MOCK_DIR = path.join(outDir, '_mocks');
fs.mkdirSync(MOCK_DIR, { recursive: true });
fs.writeFileSync(path.join(MOCK_DIR, 'BoardDataContext.jsx'), `
export function useBoardData() {
  return { data: { slug: 'demo', boardFeatures: window.__FEATURES }, calendarDayKey: 'demo-day' };
}
`);
fs.writeFileSync(path.join(MOCK_DIR, 'jewish-feed-client.js'), `
export async function fetchJewishFeed() { return window.__FEED; }
`);
fs.writeFileSync(path.join(MOCK_DIR, 'react-i18next.jsx'), `
import React from 'react';
export function withTranslation() {
  return (Component) => (props) => <Component {...props} t={(k) => (window.__T && window.__T[k]) || k} />;
}
`);

const entry = `
import React from 'react';
import ReactDOM from 'react-dom';
import he from ${JSON.stringify(path.join(ROOT, 'client/src/lib/i18n-resources/he.js'))};
import ru from ${JSON.stringify(path.join(ROOT, 'client/src/lib/i18n-resources/ru.js'))};
import en from ${JSON.stringify(path.join(ROOT, 'client/src/lib/i18n-resources/en.js'))};
import { JewishContentPanels } from ${JSON.stringify(path.join(ROOT, 'client/src/components/JewishContentPanels.jsx'))};
window.__T = { he, ru, en }[window.__LANG] || he;
ReactDOM.render(<JewishContentPanels uiLang={window.__LANG} />, document.getElementById('root'));
`;

const mockPlugin = {
  name: 'mocks',
  setup(build) {
    build.onResolve({ filter: /context\/BoardDataContext$/ }, () => ({ path: path.join(MOCK_DIR, 'BoardDataContext.jsx') }));
    build.onResolve({ filter: /lib\/jewish-feed-client$/ }, () => ({ path: path.join(MOCK_DIR, 'jewish-feed-client.js') }));
    build.onResolve({ filter: /^react-i18next$/ }, () => ({ path: path.join(MOCK_DIR, 'react-i18next.jsx') }));
  },
};

const FEEDS = {
  he: {
    chumash: { label: 'לך לך, שישי עם רש"י' },
    tanya: { label: 'אגרת הקודש, פרק כ"ו' },
    tehillim: { label: 'פרקים ל"ט - מ"ג' },
    rambam: { label: 'הלכות סוטה פרק ג' },
    rambam3: { label: 'הלכות חובל ומזיק פרק ז - ט' },
  },
  ru: {
    chumash: { label: 'Лех Леха, шестой день, с Раши' },
    tanya: { label: 'Игерет а-Кодеш, гл. 26' },
    tehillim: { label: 'Главы 39–43' },
    rambam: { label: 'Законы о сота, глава 3' },
    rambam3: { label: 'Законы о причинении ущерба, главы 7–9' },
  },
};

const ALL_ON = { dailyChumash: true, dailyTanya: true, dailyTehillim: true, dailyRambam: true, hayomYom: false };
const SCENARIOS = [
  { name: 'he-all-on', lang: 'he', features: ALL_ON },
  { name: 'he-tehillim-off', lang: 'he', features: { ...ALL_ON, dailyTehillim: false } },
  { name: 'he-chumash-off', lang: 'he', features: { ...ALL_ON, dailyChumash: false } },
  { name: 'he-rambam-off', lang: 'he', features: { ...ALL_ON, dailyRambam: false } },
  { name: 'ru-all-on', lang: 'ru', features: ALL_ON },
  { name: 'ru-tehillim-off', lang: 'ru', features: { ...ALL_ON, dailyTehillim: false } },
];

function findBrowser() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => fs.existsSync(p));
}

async function main() {
  const result = await esbuild.build({
    stdin: { contents: entry, loader: 'jsx', resolveDir: ROOT },
    bundle: true,
    write: false,
    format: 'iife',
    jsx: 'transform',
    loader: { '.js': 'jsx' },
    define: { 'process.env.NODE_ENV': '"production"' },
    nodePaths: [path.join(ROOT, 'node_modules')],
    plugins: [mockPlugin],
    logLevel: 'error',
  });
  const js = result.outputFiles[0].text;
  const css = fs.readFileSync(path.join(ROOT, 'public/board/assets/memorial.css'), 'utf8');
  const browser = findBrowser();

  for (const s of SCENARIOS) {
    const dir = s.lang === 'he' ? 'rtl' : 'ltr';
    const html = `<!doctype html><html lang="${s.lang}" dir="${dir}"><head><meta charset="utf-8">
<style>${css}</style>
<style>html,body{margin:0;background:#1b120b;} .main-container{display:block !important;height:auto !important;min-height:0 !important;padding:0 !important;} .main-container .left{width:440px !important;max-width:440px !important;height:auto !important;} .scenario-caption{color:#fff;font:12px sans-serif;padding:4px 8px;}</style>
</head><body class="board-lang-${s.lang}">
<div class="scenario-caption">${s.name}</div>
<main class="main-container"><aside class="left side-panel"><div class="wooden-panel"><div class="left-panel-inner"><div id="root"></div></div></div></aside></main>
<script>window.__LANG=${JSON.stringify(s.lang)};window.__FEATURES=${JSON.stringify(s.features)};window.__FEED=${JSON.stringify({ dailyLearning: FEEDS[s.lang] })};</script>
<script>${js}</script></body></html>`;
    const htmlPath = path.join(outDir, `${s.name}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    if (browser) {
      const png = path.join(outDir, `${s.name}.png`);
      execFileSync(browser, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
        `--screenshot=${png}`, '--window-size=460,300', '--virtual-time-budget=3000',
        `file:///${htmlPath.replace(/\\/g, '/')}`,
      ], { stdio: 'ignore', timeout: 60000 });
      console.log('wrote', png);
    } else {
      console.log('wrote', htmlPath, '(no browser found for screenshot)');
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
