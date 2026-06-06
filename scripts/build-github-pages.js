#!/usr/bin/env node
/**
 * Build a static memorial board for GitHub Pages.
 * Output: ./site/  (deployed by .github/workflows/deploy-github-pages.yml)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const SLUG = process.env.BOARD_SLUG || 'novosibirsk';
const REPO_NAME =
  process.env.GITHUB_REPOSITORY?.split('/')[1] || 'synagogue-memorial-saas';
const BASE = process.env.GITHUB_PAGES_BASE || `/${REPO_NAME}/`;

function rimraf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) {
      count += copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
      count += 1;
    }
  }
  return count;
}

function loadBoardData() {
  const dbPath = path.join(ROOT, 'database.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const { BOARD_THEME_DEFAULTS } = require('../lib/board-defaults');

  return {
    slug: SLUG,
    title: db.data.title,
    titles: { ru: db.data.title, en: '', he: '' },
    weeklyChapterEnabled: Boolean(db.data.weeklyChapterEnabled),
    shabbatTimesEnabled: true,
    dailyCites: db.data.dailyCites || [],
    people: db.data.people || [],
    theme: { ...BOARD_THEME_DEFAULTS },
    language: 'ru',
    location: {
      lat: 54.9833,
      long: 82.8964,
      city: 'Novosibirsk',
      timezone: 'Asia/Novosibirsk',
    },
    reloadTimeout: db.reloadTimeout || 43200000,
    slideshow: { enabled: false, interval: 10, mainDuration: 30, images: [] },
  };
}

function fixCssAssetPaths(cssPath, base) {
  if (!fs.existsSync(cssPath)) return;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  let css = fs.readFileSync(cssPath, 'utf8');
  css = css.replace(/url\(\s*\/images\//g, `url(${prefix}images/`);
  css = css.replace(/url\(\s*"\/images\//g, `url("${prefix}images/`);
  fs.writeFileSync(cssPath, css);
}

function writeIndexHtml(boardData) {
  const prefix = BASE.endsWith('/') ? BASE : `${BASE}/`;
  const safeTitle = String(boardData.title || 'Memorial').replace(/"/g, '&quot;');
  const dataJson = JSON.stringify(boardData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="ru" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="${prefix}board/assets/memorial.css">
</head>
<body>
  <script>window.__STATIC_SITE__ = true;</script>
  <script>window.data = ${dataJson};</script>
  <div id="root"></div>
  <script type="module" src="${prefix}board/assets/memorial.js"></script>
  <script>
    if (!location.hash || location.hash === '#') {
      location.replace(location.pathname + location.search + '#/s/${SLUG}');
    }
  </script>
</body>
</html>`;
}

function main() {
  console.log(`Building GitHub Pages site (base: ${BASE})`);
  rimraf(SITE_DIR);
  fs.mkdirSync(SITE_DIR, { recursive: true });

  execSync('npm run build:board', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      GITHUB_PAGES_BASE: BASE,
    },
  });

  copyDir(path.join(ROOT, 'public/board'), path.join(SITE_DIR, 'board'));
  const imageCount = copyDir(path.join(ROOT, 'images'), path.join(SITE_DIR, 'images'));
  const photoCount = copyDir(path.join(ROOT, 'photos'), path.join(SITE_DIR, 'photos'));

  fixCssAssetPaths(path.join(SITE_DIR, 'board/assets/memorial.css'), BASE);

  const boardData = loadBoardData();
  const html = writeIndexHtml(boardData);
  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), html);
  fs.writeFileSync(path.join(SITE_DIR, '404.html'), html);

  console.log(
    `Done → ${SITE_DIR} | ${boardData.people.length} people | ${photoCount} photos | ${imageCount} theme images`,
  );
  if (photoCount === 0) {
    console.warn('WARNING: photos/ is empty. Before push run: git add -f photos/');
  }
}

main();
