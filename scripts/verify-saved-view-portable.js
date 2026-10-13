#!/usr/bin/env node
/* eslint-disable no-console */
const assert = require('node:assert/strict');
const { stripCommunityBrandingFromSnapshot } = require('../lib/saved-view-branding');

const stripped = stripCommunityBrandingFromSnapshot({
  theme: { logo: 'x', primaryColor: '#111111' },
  publicSubmission: { donationQrImage: 'y', showDonationQr: true },
});
assert.equal(stripped.theme.logo, undefined);
assert.equal(stripped.theme.primaryColor, '#111111');
assert.equal(stripped.publicSubmission.donationQrImage, undefined);

console.log('verify-saved-view-portable: ok');
