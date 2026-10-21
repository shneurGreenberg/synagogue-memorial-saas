const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  planDefaultCommunityQrBackfill,
  applyPlannedCommunityQrBackfill,
  ensureDonationQrImage,
  ensureRegistrationQrImage,
  autoDonationQrRelativePath,
} = require('../lib/default-community-qr');

describe('release 1.25.2 backfill apply path', () => {
  it('exports ensureRegistrationQrImage and ensureDonationQrImage', () => {
    assert.equal(typeof ensureRegistrationQrImage, 'function');
    assert.equal(typeof ensureDonationQrImage, 'function');
  });

  it('apply sets only donationQrImage when registration already has a custom image', async () => {
    const row = {
      slug: 'kazan',
      name: 'Kazan',
      publicSubmission: {
        showRegistrationQr: true,
        registrationQrImage: 'custom-reg.png',
        donationQrImage: '',
        showDonationQr: false,
      },
    };
    const planned = planDefaultCommunityQrBackfill(row);
    assert.deepEqual(planned, {
      donationQrImage: autoDonationQrRelativePath('kazan'),
    });

    const doc = {
      slug: row.slug,
      publicSubmission: { ...row.publicSubmission },
    };
    await applyPlannedCommunityQrBackfill(row, doc, planned);

    assert.equal(doc.publicSubmission.registrationQrImage, 'custom-reg.png');
    assert.equal(
      doc.publicSubmission.donationQrImage,
      autoDonationQrRelativePath('kazan'),
    );
  });
});

describe('release 1.25.2 changelog version', () => {
  it('lists 1.25.2 at the head of CHANGELOG.json', () => {
    const changelog = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.json'), 'utf8'),
    );
    assert.equal(changelog[0].version, '1.25.2');
  });
});
