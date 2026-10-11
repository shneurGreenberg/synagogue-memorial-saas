#!/usr/bin/env node
/**
 * Build a static memorial board fallback for GitHub Pages.
 * Reads committed JSON snapshots from static-snapshots/ and builds a multi-tenant site.
 * Output: ./site/  (deployed by .github/workflows/deploy-github-pages.yml)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const SNAPSHOTS_DIR = path.join(ROOT, 'static-snapshots');
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

function fixCssAssetPaths(cssPath, base) {
  if (!fs.existsSync(cssPath)) return;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  let css = fs.readFileSync(cssPath, 'utf8');
  css = css.replace(/url\(\s*\/images\//g, `url(${prefix}images/`);
  css = css.replace(/url\(\s*"\/images\//g, `url("${prefix}images/`);
  fs.writeFileSync(cssPath, css);
}

function loadSnapshots() {
  const snapshots = {};
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    throw new Error(`Snapshots directory not found: ${SNAPSHOTS_DIR}`);
  }
  
  const files = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error(`No snapshot files found in ${SNAPSHOTS_DIR}`);
  }
  
  for (const file of files) {
    const slug = path.basename(file, '.json');
    const data = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, file), 'utf8'));
    snapshots[slug] = data;
    console.log(`  Loaded ${slug}: ${data.people?.length || 0} people`);
  }
  
  return snapshots;
}

function writeIndexHtml(snapshots) {
  const prefix = BASE.endsWith('/') ? BASE : `${BASE}/`;
  const slugs = Object.keys(snapshots);
  const defaultSlug = slugs.includes('novosibirsk') ? 'novosibirsk' : slugs[0];
  
  const snapshotsJson = JSON.stringify(snapshots).replace(/</g, '\\u003c');
  const defaultTitle = snapshots[defaultSlug]?.title || 'Memorial Board';
  const safeTitle = String(defaultTitle).replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="ru" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <link rel="icon" type="image/x-icon" href="${prefix}favicon.ico">
  <link rel="stylesheet" href="${prefix}board/assets/memorial.css">
</head>
<body>
  <script>window.__STATIC_SITE__ = true;</script>
  <script>
    (function() {
      const snapshots = ${snapshotsJson};
      const hash = location.hash || '';
      const match = hash.match(/^#\\/s\\/([^\\/\\?#]+)/);
      const slug = match ? match[1] : '${defaultSlug}';
      
      window.data = snapshots[slug] || snapshots['${defaultSlug}'] || {};
      
      if (!hash || hash === '#' || hash === '#/') {
        location.replace(location.pathname + location.search + '#/s/${defaultSlug}');
      }
      
      window.addEventListener('hashchange', function() {
        const newHash = location.hash || '';
        const newMatch = newHash.match(/^#\\/s\\/([^\\/\\?#]+)/);
        const newSlug = newMatch ? newMatch[1] : '${defaultSlug}';
        if (newSlug !== slug) {
          location.reload();
        }
      });
    })();
  </script>
  <div id="root"></div>
  <script type="module" src="${prefix}board/assets/memorial.js"></script>
</body>
</html>`;
}

function main() {
  console.log(`🚀 Building GitHub Pages fallback site (base: ${BASE})\n`);
  
  const snapshots = loadSnapshots();
  console.log();
  
  rimraf(SITE_DIR);
  fs.mkdirSync(SITE_DIR, { recursive: true });

  console.log('📦 Building board SPA...');
  execSync('npm run build:board', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      GITHUB_PAGES_BASE: BASE,
    },
  });

  console.log('\n📁 Copying assets...');
  copyDir(path.join(ROOT, 'public/board'), path.join(SITE_DIR, 'board'));
  const imageCount = copyDir(path.join(ROOT, 'images'), path.join(SITE_DIR, 'images'));
  const photoCount = copyDir(path.join(ROOT, 'photos'), path.join(SITE_DIR, 'photos'));

  fixCssAssetPaths(path.join(SITE_DIR, 'board/assets/memorial.css'), BASE);

  console.log('\n📝 Writing HTML files...');
  const html = writeIndexHtml(snapshots);
  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), html);
  fs.writeFileSync(path.join(SITE_DIR, '404.html'), html);
  fs.writeFileSync(path.join(SITE_DIR, '.nojekyll'), '');
  
  // Copy favicon if it exists
  const faviconSrc = path.join(ROOT, 'public/favicon.ico');
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(SITE_DIR, 'favicon.ico'));
  }
  
  const totalPeople = Object.values(snapshots).reduce((sum, s) => sum + (s.people?.length || 0), 0);
  console.log(`\n✅ Done → ${SITE_DIR}`);
  console.log(`   Tenants: ${Object.keys(snapshots).join(', ')}`);
  console.log(`   Total people: ${totalPeople}`);
  console.log(`   Photos: ${photoCount}`);
  console.log(`   Images: ${imageCount}`);
  
  if (photoCount === 0) {
    console.warn('\n⚠️  WARNING: photos/ is empty');
  }
}

main();
