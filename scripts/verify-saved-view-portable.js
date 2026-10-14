#!/usr/bin/env node
/* eslint-disable no-console */
const assert = require('node:assert/strict');
const { stripCommunityBrandingFromSnapshot } = require('../lib/saved-view-branding');

const stripped = stripCommunityBrandingFromSnapshot({
  theme: { logo: 'x', primaryColor: '#111111' },
  titles: { ru: 'Title' },
  publicSubmission: { donationQrImage: 'y', showDonationQr: true },
  memorialQrPanel: { donationTitles: { ru: 'Donate' }, titleScale: 100 },
});
assert.equal(stripped.theme.logo, undefined);
assert.equal(stripped.theme.primaryColor, '#111111');
assert.equal(stripped.titles, undefined);
assert.equal(stripped.publicSubmission, undefined);
assert.equal(stripped.memorialQrPanel.titleScale, 100);
assert.equal(stripped.memorialQrPanel.donationTitles, undefined);

console.log('verify-saved-view-portable: ok');
