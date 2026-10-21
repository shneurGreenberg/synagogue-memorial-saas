const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  planDefaultCommunityQrBackfill,
  autoDonationQrRelativePath,
  autoRegistrationQrRelativePath,
} = require('../lib/default-community-qr');
const {
  isAutoCommunityQrReferencedBySynagogue,
  expectedAutoCommunityQrRelativePath,
} = require('../lib/community-qr-on-demand');

describe('release 1.25.1 per-barcode backfill planning', () => {
  it('plans only donation QR when registration already shows on the board without a stored image', () => {
    const planned = planDefaultCommunityQrBackfill({
      slug: 'kazan',
      publicSubmission: {
        showRegistrationQr: true,
        registrationQrImage: '',
        donationQrImage: '',
        showDonationQr: false,
      },
    });
    assert.deepEqual(planned, {
      donationQrImage: autoDonationQrRelativePath('kazan'),
    });
  });

  it('plans neither field when both barcodes already appear on the board', () => {
    assert.equal(
      planDefaultCommunityQrBackfill({
        slug: 'busy',
        publicSubmission: {
          showRegistrationQr: true,
          donationUrl: 'https://donate.example',
          registrationQrImage: '',
          donationQrImage: '',
        },
      }),
      null,
    );
  });
});

describe('release 1.25.1 community QR route reference checks', () => {
  const regPath = autoRegistrationQrRelativePath('demo');
  const donPath = autoDonationQrRelativePath('demo');

  it('treats only auto paths stored in publicSubmission as referenced', () => {
    assert.equal(
      isAutoCommunityQrReferencedBySynagogue(
        { slug: 'demo', publicSubmission: { registrationQrImage: regPath } },
        'registration',
        regPath,
      ),
      true,
    );
    assert.equal(
      isAutoCommunityQrReferencedBySynagogue(
        { slug: 'demo', publicSubmission: { registrationQrImage: '' } },
        'registration',
        regPath,
      ),
      false,
    );
    assert.equal(
      isAutoCommunityQrReferencedBySynagogue(
        { slug: 'demo', publicSubmission: { registrationQrImage: 'custom.png' } },
        'registration',
        regPath,
      ),
      false,
    );
  });

  it('maps slug and kind to the expected relative auto path', () => {
    assert.equal(
      expectedAutoCommunityQrRelativePath('x', 'registration'),
      autoRegistrationQrRelativePath('x'),
    );
    assert.equal(
      expectedAutoCommunityQrRelativePath('x', 'donation'),
      autoDonationQrRelativePath('x'),
    );
  });

  it('community QR handler returns 404 for unreferenced requests instead of passing errors', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'community-qr-on-demand.js'),
      'utf8',
    );
    assert.match(source, /res\.status\(404\)\.end\(\)/);
    assert.doesNotMatch(source, /catch \(err\)[\s\S]*next\(err\)/);
  });
});

describe('release 1.25.1 Node 24 toolchain', () => {
  it('pins Node 24 in Amvera, Docker, and CI', () => {
    const amvera = fs.readFileSync(path.join(__dirname, '..', 'amvera.yaml'), 'utf8');
    const docker = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
    const ci = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'test.yml'),
      'utf8',
    );
    assert.match(amvera, /version:\s*"24"/);
    assert.match(docker, /node:24-bookworm-slim/);
    assert.match(ci, /node-version:\s*'24'/);
  });

  it('requires Node >=24 in package.json engines', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.match(pkg.engines.node, /24/);
  });
});

describe('release 1.25.1 changelog version', () => {
  it('lists 1.25.1 at the head of CHANGELOG.json', () => {
    const changelog = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.json'), 'utf8'),
    );
    assert.equal(changelog[0].version, '1.25.1');
  });
});
