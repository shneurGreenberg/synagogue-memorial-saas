const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  communityShowsBarcodesOnBoard,
  planDefaultCommunityQrBackfill,
  parseAutoCommunityQrFilename,
  autoRegistrationQrRelativePath,
  autoDonationQrRelativePath,
} = require('../lib/default-community-qr');
const { ICONS } = require('../lib/admin-icons');

const SCSS_PATH = path.join(__dirname, '..', 'styles', 'public-submission.scss');
const DECEASED_BLOCK = path.join(
  __dirname,
  '..',
  'views',
  'partials',
  'public-add-name-deceased-block.handlebars',
);
const ADMIN_LAYOUT = path.join(__dirname, '..', 'views', 'layouts', 'admin.handlebars');
const EVENTS_VIEW = path.join(__dirname, '..', 'views', 'admin', 'events.handlebars');
const SIDEBAR_PANEL = path.join(
  __dirname,
  '..',
  'client',
  'src',
  'components',
  'SidebarUpcomingPanel.jsx',
);

describe('release 1.25 C1 add-name phone proportions', () => {
  it('uses a narrow dial column and wide national number column', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    const block = scss.match(/\.public-phone-row\s*\{[^}]+\}/);
    assert.ok(block, '.public-phone-row rule missing');
    assert.match(block[0], /grid-template-columns:\s*minmax\([^)]+\)\s+minmax\(0,\s*1fr\)/);
    const dialMax = block[0].match(/minmax\([^,]+,\s*([^)]+)\)/);
    assert.ok(dialMax, 'dial column max missing');
    const maxRem = Number.parseFloat(dialMax[1]);
    assert.ok(maxRem > 0 && maxRem <= 8, `dial column should stay narrow (got ${dialMax[1]})`);
  });
});

describe('release 1.25 C3 phone row LTR in Hebrew', () => {
  it('forces LTR layout so country code stays left of the number', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    const block = scss.match(/\.public-phone-row\s*\{[^}]+\}/);
    assert.ok(block);
    assert.match(block[0], /direction:\s*ltr/);
  });
});

describe('release 1.25 C4 Gregorian death date without select arrow', () => {
  it('does not use public-select-field on the death date text input', () => {
    const html = fs.readFileSync(DECEASED_BLOCK, 'utf8');
    assert.match(html, /public-death-date-input/);
    assert.doesNotMatch(html, /deathDate[\s\S]*public-select-field/);
  });

  it('styles death date input without dropdown chevron', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    assert.match(scss, /\.public-death-date-input[\s\S]*background-image:\s*none/);
  });
});

describe('release 1.25 C5 admin announcement icon', () => {
  it('exposes announcement icon distinct from megaphone', () => {
    assert.ok(ICONS.announcement);
    assert.notEqual(ICONS.announcement, ICONS.megaphone);
  });

  it('uses announcement icon for admin events nav and page title', () => {
    const layout = fs.readFileSync(ADMIN_LAYOUT, 'utf8');
    const events = fs.readFileSync(EVENTS_VIEW, 'utf8');
    assert.match(events, /adminIcon 'announcement'/);
    assert.doesNotMatch(events, /adminIcon 'megaphone'/);
    assert.match(layout, /adminIcon 'announcement'/);
    assert.doesNotMatch(layout, /M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4/);
  });

  it('leaves public board sidebar unchanged (no megaphone reintroduced)', () => {
    const panel = fs.readFileSync(SIDEBAR_PANEL, 'utf8');
    assert.doesNotMatch(panel, /megaphone/i);
  });
});

describe('release 1.25 C6 add-name toggles mobile UX', () => {
  it('disables tap highlight and stray focus rings while keeping focus-visible', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    assert.match(scss, /-webkit-tap-highlight-color:\s*transparent/);
    assert.match(scss, /\.public-lang-switch-pills[\s\S]*:focus\s*\{[^}]*outline:\s*none/);
    assert.match(scss, /\.public-gender-pills[\s\S]*:focus-visible/);
    assert.match(scss, /user-select:\s*none/);
  });

  it('gives gender options 50% width and language pills equal flex widths', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    assert.match(scss, /\.public-gender-pills[\s\S]*flex:\s*1\s+1\s+50%/);
    assert.match(scss, /\.public-lang-switch-pills[\s\S]*\.public-lang-pill[\s\S]*flex:\s*1/);
  });
});

describe('release 1.25 C2 safe barcode auto-generation', () => {
  it('parses auto community QR filenames', () => {
    assert.deepEqual(parseAutoCommunityQrFilename('demo-add-name.png'), {
      slug: 'demo',
      kind: 'registration',
    });
    assert.deepEqual(parseAutoCommunityQrFilename('my-town-donation.png'), {
      slug: 'my-town',
      kind: 'donation',
    });
    assert.equal(parseAutoCommunityQrFilename('custom.png'), null);
  });

  it('skips backfill when board already shows barcodes without stored images', () => {
    assert.equal(communityShowsBarcodesOnBoard({ showRegistrationQr: true }), true);
    assert.equal(
      communityShowsBarcodesOnBoard({ showDonationQr: true, donationUrl: 'https://donate.example' }),
      true,
    );
    assert.equal(
      communityShowsBarcodesOnBoard({ showRegistrationQr: false, showDonationQr: false }),
      false,
    );
    assert.equal(
      planDefaultCommunityQrBackfill({ slug: 'quiet', publicSubmission: { showRegistrationQr: true } }),
      null,
    );
  });

  it('plans only empty QR fields and never overwrites existing paths', () => {
    const planned = planDefaultCommunityQrBackfill({
      slug: 'newbie',
      publicSubmission: {
        showRegistrationQr: false,
        showDonationQr: false,
        registrationQrImage: '',
        donationQrImage: '',
      },
    });
    assert.deepEqual(planned, {
      registrationQrImage: autoRegistrationQrRelativePath('newbie'),
      donationQrImage: autoDonationQrRelativePath('newbie'),
    });
    assert.deepEqual(
      planDefaultCommunityQrBackfill({
        slug: 'kept',
        publicSubmission: {
          showRegistrationQr: false,
          showDonationQr: false,
          registrationQrImage: 'custom-reg.png',
          donationQrImage: '',
        },
      }),
      { donationQrImage: autoDonationQrRelativePath('kept') },
    );
  });

  it('registers on-demand community QR middleware before static /images', () => {
    const assets = fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'express-static-assets.js'),
      'utf8',
    );
    assert.match(assets, /registerCommunityQrOnDemand/);
    assert.match(assets, /community-qr/);
  });

  it('backfill script supports --slug filter and field-level dry-run output', () => {
    const script = fs.readFileSync(
      path.join(__dirname, '..', 'scripts', 'backfill-default-qr.js'),
      'utf8',
    );
    assert.match(script, /--slug=/);
    assert.match(script, /planDefaultCommunityQrBackfill/);
    assert.match(script, /would set publicSubmission\./);
  });
});

describe('release 1.25 changelog version', () => {
  it('lists 1.25.0 at the head of CHANGELOG.json', () => {
    const changelog = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.json'), 'utf8'),
    );
    assert.equal(changelog[0].version, '1.25.0');
  });
});
