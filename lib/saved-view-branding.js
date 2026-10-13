function stripCommunityBrandingFromSnapshot(snapshot) {
  const snap = JSON.parse(JSON.stringify(snapshot || {}));
  if (snap.theme && typeof snap.theme === 'object') {
    delete snap.theme.logo;
  }
  if (snap.publicSubmission && typeof snap.publicSubmission === 'object') {
    delete snap.publicSubmission.donationQrImage;
    delete snap.publicSubmission.registrationQrImage;
    delete snap.publicSubmission.showDonationQr;
    delete snap.publicSubmission.showRegistrationQr;
  }
  return snap;
}

module.exports = {
  stripCommunityBrandingFromSnapshot,
};
