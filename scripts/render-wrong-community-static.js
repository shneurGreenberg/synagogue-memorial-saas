#!/usr/bin/env node
/**
 * Render admin wrong-community page to self-contained static HTML (he + ru).
 * Usage: node scripts/render-wrong-community-static.js [label]
 * Output: ../v117-render/<label>/{he,ru}.html (label defaults to "output")
 */
const fs = require('fs');
const path = require('path');
const sass = require('sass');
const handlebars = require('express-handlebars');
const { getTranslator } = require('../lib/admin-translations');

const ROOT = path.join(__dirname, '..');
const label = (process.argv[2] || 'output').trim();
const outDir = path.resolve(ROOT, '..', 'v117-render', label);

function compileAdminCss() {
  const result = sass.compile(path.join(ROOT, 'styles', 'admin.scss'), {
    loadPaths: [path.join(ROOT, 'styles')],
  });
  return result.css;
}

function buildEngine() {
  return handlebars.create({
    extname: '.handlebars',
    layoutsDir: path.join(ROOT, 'views', 'layouts'),
    partialsDir: path.join(ROOT, 'views', 'partials'),
    defaultLayout: false,
  });
}

function sampleContext(lang) {
  const t = getTranslator(lang);
  const targetSlug = 'beta';
  const sessionSlug = 'alpha';
  const loginUrl = `/admin/logout?next=${encodeURIComponent(`/admin/login?slug=${targetSlug}&next=%2Fadmin%2F${targetSlug}%2Fdashboard`)}`;
  return {
    layout: false,
    lang,
    dir: lang === 'he' ? 'rtl' : 'ltr',
    targetSlug,
    targetCommunityName: lang === 'he' ? 'קהילת ביתא' : 'Община Бета',
    sessionSlug,
    loginUrl,
    logoutUrl: loginUrl,
    title: t('admin_wrong_community_title'),
    message: t('admin_wrong_community_message'),
    loginButton: t('admin_wrong_community_login'),
    logoutButton: t('admin_wrong_community_logout_first'),
    backToMyCommunity: t('admin_wrong_community_back'),
    myCommunityUrl: `/admin/${encodeURIComponent(sessionSlug)}/dashboard`,
    cssVersion: 'static',
  };
}

function inlineStyles(html, css) {
  let out = html.replace(
    /<link rel="stylesheet" href="\/css\/admin\.css\?v=[^"]*">/,
    `<style>\n${css}\n</style>`,
  );
  out = out.replace(
    /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g,
    '',
  );
  out = out.replace(
    /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*/g,
    '',
  );
  out = out.replace(
    /<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+" rel="stylesheet">\s*/g,
    '',
  );
  return out;
}

async function main() {
  const engine = buildEngine();
  const css = compileAdminCss();
  const view = path.join(ROOT, 'views', 'admin', 'wrong-community.handlebars');

  fs.mkdirSync(outDir, { recursive: true });

  for (const lang of ['he', 'ru']) {
    const raw = await engine.render(view, sampleContext(lang));
    const html = inlineStyles(raw, css);
    const file = path.join(outDir, `${lang}.html`);
    fs.writeFileSync(file, html, 'utf8');
    console.log(`Wrote ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
