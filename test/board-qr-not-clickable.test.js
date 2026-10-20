const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('board QR panels are not links', () => {
  it('memorial submission QR is a static frame', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'components', 'MemorialSubmissionPanel.jsx'),
      'utf8',
    );
    assert.doesNotMatch(source, /memorial-submission-qr-link/);
    assert.match(source, /memorial-submission-qr-frame/);
  });

  it('donation QR is a static frame', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'components', 'DonationQrPanel.jsx'),
      'utf8',
    );
    assert.doesNotMatch(source, /<a[\s\S]*memorial-submission-qr/);
    assert.match(source, /memorial-submission-qr-frame/);
  });
});
