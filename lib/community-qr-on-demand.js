const fs = require('fs');
const path = require('path');
const Synagogue = require('../models/Synagogue');
const { IMAGES_DIR } = require('./storage-paths');
const {
  AUTO_QR_DIR,
  parseAutoCommunityQrFilename,
  ensureRegistrationQrImage,
  ensureDonationQrImage,
  autoRegistrationQrRelativePath,
  autoDonationQrRelativePath,
  isAutoRegistrationQrImage,
  isAutoDonationQrImage,
} = require('./default-community-qr');

function isAutoCommunityQrReferencedBySynagogue(synagogue, kind, relativePath) {
  const slug = String(synagogue?.slug || '').trim();
  if (!slug) {
    return false;
  }
  const publicSubmission = synagogue.publicSubmission || {};
  if (kind === 'registration') {
    const regRef = String(publicSubmission.registrationQrImage || '').trim();
    if (!regRef || !isAutoRegistrationQrImage(slug, regRef)) {
      return false;
    }
    return relativePath === autoRegistrationQrRelativePath(slug);
  }
  const donRef = String(publicSubmission.donationQrImage || '').trim();
  if (!donRef || !isAutoDonationQrImage(slug, donRef)) {
    return false;
  }
  return relativePath === autoDonationQrRelativePath(slug);
}

function expectedAutoCommunityQrRelativePath(slug, kind) {
  return kind === 'registration'
    ? autoRegistrationQrRelativePath(slug)
    : autoDonationQrRelativePath(slug);
}

function autoQrFullPath(relativePath) {
  return path.join(IMAGES_DIR, ...String(relativePath).split('/'));
}

async function ensureAutoCommunityQrFile(slug, kind, env = process.env) {
  const trimmedSlug = String(slug || '').trim();
  if (!trimmedSlug) {
    return null;
  }

  const synagogue = await Synagogue.findOne({ slug: trimmedSlug })
    .select('slug publicSubmission')
    .lean();
  if (!synagogue) {
    return null;
  }

  const publicSubmission = synagogue.publicSubmission || {};
  if (kind === 'registration') {
    return ensureRegistrationQrImage(
      trimmedSlug,
      publicSubmission.registrationQrImage,
      env,
    );
  }

  return ensureDonationQrImage(
    trimmedSlug,
    publicSubmission.donationUrl,
    publicSubmission.donationQrImage,
    env,
  );
}

function registerCommunityQrOnDemand(app) {
  app.get('/images/community-qr/:filename', async (req, res, next) => {
    const filename = path.basename(String(req.params.filename || ''));
    const parsed = parseAutoCommunityQrFilename(filename);
    if (!parsed) {
      return next();
    }

    const relativePath = path.posix.join(AUTO_QR_DIR, filename);
    const expectedPath = expectedAutoCommunityQrRelativePath(parsed.slug, parsed.kind);
    if (relativePath !== expectedPath) {
      return res.status(404).end();
    }

    const fullPath = autoQrFullPath(relativePath);
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }

    try {
      const synagogue = await Synagogue.findOne({ slug: parsed.slug })
        .select('slug publicSubmission')
        .lean();
      if (!synagogue || !isAutoCommunityQrReferencedBySynagogue(synagogue, parsed.kind, relativePath)) {
        return res.status(404).end();
      }

      const written = await ensureAutoCommunityQrFile(parsed.slug, parsed.kind);
      if (written && fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
      return res.status(404).end();
    } catch (err) {
      return res.status(404).end();
    }
  });
}

async function regenerateMissingAutoQrAtStartup(env = process.env) {
  const rows = await Synagogue.find({}).select('slug publicSubmission').lean();
  for (const row of rows) {
    const slug = String(row.slug || '').trim();
    if (!slug) {
      continue;
    }
    const publicSubmission = row.publicSubmission || {};
    const regRef = String(publicSubmission.registrationQrImage || '').trim();
    const regRel = autoRegistrationQrRelativePath(slug);
    if (!regRef || isAutoRegistrationQrImage(slug, regRef)) {
      if (!fs.existsSync(autoQrFullPath(regRel))) {
        await ensureRegistrationQrImage(slug, regRef, env);
      }
    }

    const donRef = String(publicSubmission.donationQrImage || '').trim();
    const donRel = autoDonationQrRelativePath(slug);
    if (!donRef || isAutoDonationQrImage(slug, donRef)) {
      if (!fs.existsSync(autoQrFullPath(donRel))) {
        await ensureDonationQrImage(slug, publicSubmission.donationUrl, donRef, env);
      }
    }
  }
}

module.exports = {
  registerCommunityQrOnDemand,
  regenerateMissingAutoQrAtStartup,
  ensureAutoCommunityQrFile,
  isAutoCommunityQrReferencedBySynagogue,
  expectedAutoCommunityQrRelativePath,
};
