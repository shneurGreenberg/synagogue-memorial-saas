const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildSavedViewExport,
  normalizeImportedSnapshot,
} = require('../lib/saved-view-portable');

describe('saved-view export', () => {
  it('builds portable JSON payload for download', () => {
    const payload = buildSavedViewExport({
      id: 'view-1',
      name: 'Winter theme',
      snapshot: { theme: { primaryColor: '#112233' } },
    });

    assert.ok(payload.format);
    assert.ok(payload.formatVersion >= 1);
    assert.equal(payload.name, 'Winter theme');
    assert.deepEqual(payload.snapshot.theme.primaryColor, '#112233');
    assert.ok(JSON.stringify(payload).includes('Winter theme'));
  });

  it('omits community logo and QR assets from export', () => {
    const payload = buildSavedViewExport({
      name: 'Branded',
      snapshot: {
        theme: { logo: 'community-logo.png', primaryColor: '#112233' },
        publicSubmission: {
          donationQrImage: 'donate.png',
          registrationQrImage: 'register.png',
          showDonationQr: true,
        },
      },
    });

    assert.equal(payload.snapshot.theme.logo, undefined);
    assert.equal(payload.snapshot.publicSubmission?.donationQrImage, undefined);
    assert.equal(payload.assets.logo, undefined);
    assert.equal(payload.assets.donationQrImage, undefined);
    assert.equal('registrationQrImage' in payload.assets, false);
  });

  it('ignores imported logo and QR images in favor of synagogue values', () => {
    const synagogue = {
      theme: { logo: 'keep-logo.png', primaryColor: '#000000' },
      publicSubmission: {
        donationQrImage: 'keep-donate.png',
        registrationQrImage: 'keep-register.png',
        showDonationQr: false,
        showRegistrationQr: true,
      },
    };

    const snapshot = normalizeImportedSnapshot({
      snapshot: {
        theme: { logo: 'imported-logo.png', primaryColor: '#abcdef' },
        publicSubmission: {
          donationQrImage: 'imported-donate.png',
          registrationQrImage: 'imported-register.png',
          showDonationQr: true,
          showRegistrationQr: false,
        },
      },
    }, synagogue);

    assert.equal(snapshot.theme.logo, 'keep-logo.png');
    assert.equal(snapshot.publicSubmission.donationQrImage, 'keep-donate.png');
    assert.equal(snapshot.publicSubmission.registrationQrImage, 'keep-register.png');
    assert.equal(snapshot.publicSubmission.showDonationQr, false);
    assert.equal(snapshot.publicSubmission.showRegistrationQr, true);
    assert.equal(snapshot.theme.primaryColor, '#abcdef');
  });
});

const http = require('node:http');
const { buildExportContentDisposition } = require('../lib/saved-view-portable');
describe('saved-view export header', () => {
  it('is header-safe with a Hebrew name', () => {
    const h = buildExportContentDisposition({ id: 'abc123', name: 'תצוגת "חורף" / ראשית' });
    assert.ok(/^[\x20-\x7e]+$/.test(h));
    assert.ok(h.includes('filename="saved-view-abc123.json"'));
    assert.ok(h.includes("filename*=UTF-8''"));
    assert.ok(decodeURIComponent(h.split("UTF-8''")[1]).startsWith('תצוגת'));
    const res = new http.ServerResponse(new http.IncomingMessage(null));
    assert.doesNotThrow(() => res.setHeader('Content-Disposition', h));
  });
});
