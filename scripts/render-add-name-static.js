#!/usr/bin/env node
/**
 * Render public add-name page (he + ru) with inlined compiled CSS.
 * Output: ../v119-render/add-name-he.html, add-name-ru.html
 */
const fs = require('fs');
const path = require('path');
const sass = require('sass');
const handlebars = require('express-handlebars');
const { getPublicSubmissionTranslator } = require('../lib/public-submission-i18n');
const { getRelationOptions } = require('../lib/submission-relation');
const { normalizePublicSubmission } = require('../lib/public-submission');

const ROOT = path.join(__dirname, '..');
const outDir = path.resolve(ROOT, '..', 'v119-render');

function compilePublicCss() {
  const result = sass.compile(path.join(ROOT, 'styles', 'public-submission.scss'), {
    loadPaths: [path.join(ROOT, 'styles')],
  });
  return result.css.replace(/url\('\/images\/brickwall\.jpg'\)/g, "url('../wt-c/images/brickwall.jpg')");
}

function buildEngine() {
  return handlebars.create({
    extname: '.handlebars',
    layoutsDir: path.join(ROOT, 'views', 'layouts'),
    partialsDir: path.join(ROOT, 'views', 'partials'),
    defaultLayout: 'public',
    helpers: {
      eq: (a, b) => a === b,
      publicT(key, options) {
        const root = options.data && options.data.root;
        const translate = root && root.pt;
        return typeof translate === 'function' ? translate(key) : key;
      },
    },
  });
}

function sampleSynagogue() {
  return {
    name: 'קהילת נובוסיבירסק',
    slug: 'novosibirsk',
    language: 'ru',
    theme: {
      logo: 'sample-logo.png',
      logoBackground: 'white',
      primaryColor: '#cfaf1f',
    },
    publicSubmission: {
      enabled: true,
      donationUrl: 'https://example.com/donate',
    },
    provisioning: {},
  };
}

function sampleContext(lang) {
  const synagogue = sampleSynagogue();
  const pt = getPublicSubmissionTranslator(lang);
  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
  const emptyDeceasedBlock = {
    name: '',
    fatherName: '',
    deathDate: '',
    relationKey: '',
    relationOther: '',
    diedAfterSunset: false,
  };
  return {
    synagogue,
    lang,
    dir: lang === 'he' ? 'rtl' : 'ltr',
    pt,
    publicSubmission,
    boardUrl: '/s/novosibirsk',
    formUrl: '/s/novosibirsk/add-name',
    successUrl: '/s/novosibirsk/add-name/success',
    charityUrl: '/s/novosibirsk/add-name/charity',
    officialLogoUrl: '/images/kaddish-official-logo.svg',
    communityLogoUrl: '/images/sample-logo.png',
    communityLogoBackground: 'white',
    inviteMode: false,
    relationOptions: getRelationOptions(lang),
    emptyDeceasedBlock,
    values: { contactName: '', contactPhone: '', deceasedNotes: '' },
    deceasedList: [{ ...emptyDeceasedBlock, index: '0', displayIndex: 1 }],
    showDeceasedIndex: false,
    error: '',
    errorMessage: '',
    cssVersion: 'static',
  };
}

function inlineStyles(html, css) {
  return html.replace(
    /<link rel="stylesheet" href="\/css\/public-submission\.css\?v=[^"]*">/,
    `<style>\n${css}\n</style>`,
  );
}

async function main() {
  const engine = buildEngine();
  const css = compilePublicCss();
  const view = path.join(ROOT, 'views', 'public', 'add-name.handlebars');

  fs.mkdirSync(outDir, { recursive: true });

  for (const lang of ['he', 'ru']) {
    const raw = await engine.render(view, sampleContext(lang));
    const html = inlineStyles(raw, css);
    const file = path.join(outDir, `add-name-${lang}.html`);
    fs.writeFileSync(file, html, 'utf8');
    console.log(`Wrote ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
