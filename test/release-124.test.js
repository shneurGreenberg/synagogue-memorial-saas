const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { translateLearningLine } = require('../lib/jewish-translations');
const {
  resolveAddNameQrUrl,
  resolveDonationQrTargetUrl,
  communityHasAnyQrSet,
  autoDonationQrRelativePath,
  isAutoDonationQrImage,
} = require('../lib/default-community-qr');
const { resolvePublicBaseUrl, DEFAULT_PUBLIC_BASE_URL } = require('../lib/public-base-url');
const { getPublicSubmissionTranslator } = require('../lib/public-submission-i18n');
const { buildDeceasedBoardName } = require('../lib/deceased-board-name');

describe('release 1.24 B1 Tehillim Russian labels', () => {
  it('uses Псалмы instead of Christian Psalter wording in feed translations', () => {
    const line = translateLearningLine('Tehillim: Psalms 39-43', 'ru');
    assert.match(line, /Псалмы/);
    assert.doesNotMatch(line, /Псалт/i);
    assert.doesNotMatch(line, /Тегилим/i);
  });

  it('board ru i18n names the daily Tehillim section Теилим without title sublabel', () => {
    const ru = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'lib', 'i18n-resources', 'ru.js'),
      'utf8',
    );
    assert.match(ru, /daily_tehillim:\s*'Теилим'/);
    assert.match(ru, /daily_tehillim_sublabel:\s*''/);
  });

  it('sanitizeRussianLearningText strips psalter wording and Hebrew Tehillim', () => {
    const { sanitizeRussianLearningText } = require('../lib/jewish-translations');
    assert.equal(sanitizeRussianLearningText('Псалтырь 39-43'), 'Псалмы 39-43');
    assert.equal(sanitizeRussianLearningText('Псалтирь: главы'), 'Псалмы: главы');
    assert.doesNotMatch(sanitizeRussianLearningText('תהילים: Псалмы 1'), /תהילים/);
  });

  it('admin ru feature label references псалмы', () => {
    const { getTranslator } = require('../lib/admin-translations');
    const label = getTranslator('ru')('feature_daily_tehillim');
    assert.match(label, /псалмы/i);
    assert.doesNotMatch(label, /Тегилим/i);
  });
});

describe('release 1.24 B2 default community QR', () => {
  it('uses configured public base URL with Warsaw fallback (never req protocol)', () => {
    assert.equal(resolvePublicBaseUrl({}), DEFAULT_PUBLIC_BASE_URL);
    assert.equal(
      resolveAddNameQrUrl('demo', { PUBLIC_BASE_URL: 'https://custom.example' }),
      'https://custom.example/s/demo/add-name',
    );
  });

  it('donation QR targets setup page until a donation URL exists', () => {
    const slug = 'novosibirsk';
    const setup = resolveDonationQrTargetUrl(slug, '', {});
    assert.equal(setup, `${DEFAULT_PUBLIC_BASE_URL}/s/${slug}/donation-setup`);
    assert.equal(
      resolveDonationQrTargetUrl(slug, 'example.org/donate', {}),
      'https://example.org/donate',
    );
  });

  it('backfill only considers communities with no QR images', () => {
    assert.equal(communityHasAnyQrSet({}), false);
    assert.equal(communityHasAnyQrSet({ registrationQrImage: 'a.png' }), true);
    assert.equal(communityHasAnyQrSet({ donationQrImage: 'b.png' }), true);
  });

  it('tracks auto donation QR filenames for regeneration', () => {
    const rel = autoDonationQrRelativePath('tomsk');
    assert.ok(isAutoDonationQrImage('tomsk', rel));
    assert.equal(isAutoDonationQrImage('tomsk', 'custom-upload.png'), false);
  });

  it('exposes idempotent backfill script with dry-run default', () => {
    const script = fs.readFileSync(
      path.join(__dirname, '..', 'scripts', 'backfill-default-qr.js'),
      'utf8',
    );
    assert.match(script, /--apply/);
    assert.match(script, /planDefaultCommunityQrBackfill/);
  });

  it('registers donation-setup admin route', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'public-submission.js'), 'utf8');
    assert.match(source, /\/:slug\/donation-setup/);
    assert.match(source, /requireAdminForCommunitySlug/);
  });
});

describe('release 1.24 B3 add-name gender pill labels', () => {
  it('shows איש/אישה (and ru/en equivalents) while board names keep בן/בת', () => {
    const he = getPublicSubmissionTranslator('he');
    const ru = getPublicSubmissionTranslator('ru');
    const en = getPublicSubmissionTranslator('en');
    assert.equal(he('deceased_gender_short_male'), 'איש');
    assert.equal(he('deceased_gender_short_female'), 'אישה');
    assert.equal(ru('deceased_gender_short_male'), 'Мужчина');
    assert.equal(ru('deceased_gender_short_female'), 'Женщина');
    assert.equal(en('deceased_gender_short_male'), 'Man');
    assert.equal(en('deceased_gender_short_female'), 'Woman');
    assert.equal(
      buildDeceasedBoardName({
        deceasedName: 'משה',
        fatherName: 'אברהם',
        gender: 'male',
        lang: 'he',
      }),
      'משה בן אברהם',
    );
  });
});

describe('release 1.24 B4 board announcements heading', () => {
  it('restores public board sidebar title without megaphone icon', () => {
    const panel = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'components', 'SidebarUpcomingPanel.jsx'),
      'utf8',
    );
    assert.doesNotMatch(panel, /sidebar-announcements-icon/);
    assert.doesNotMatch(panel, /megaphone/i);

    const he = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'lib', 'i18n-resources', 'he.js'),
      'utf8',
    );
    assert.match(he, /sidebar_upcoming_title:\s*'ימים מיוחדים והכרזות'/);

    const ru = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'lib', 'i18n-resources', 'ru.js'),
      'utf8',
    );
    assert.match(ru, /sidebar_upcoming_title:\s*'Ближайшие даты и объявления'/);

    const en = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'lib', 'i18n-resources', 'en.js'),
      'utf8',
    );
    assert.match(en, /sidebar_upcoming_title:\s*'Upcoming dates & announcements'/);
  });

  it('keeps הודעות rename on admin events page', () => {
    const events = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin', 'events.handlebars'), 'utf8');
    assert.match(events, /community_events/);
  });
});
