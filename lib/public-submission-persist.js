const Synagogue = require('../models/Synagogue');
const { buildPersonAddRequest } = require('./person-add-request');
const { optimizeUploadedImage } = require('./image-optimize');
const { parsePhotoCropFromBody } = require('./photo-crop');
const { indexPhotoFiles, photoFieldName } = require('./public-submission-form');

function photoCropFromDeceasedFields(fields) {
  if (!fields || typeof fields !== 'object') {
    return undefined;
  }
  return parsePhotoCropFromBody({
    photoCropX: fields.photoCropX,
    photoCropY: fields.photoCropY,
    photoCropZoom: fields.photoCropZoom,
  });
}

async function pushPersonAddRequests(slug, entries, contact, photoFiles, consentMeta = {}) {
  const byField = indexPhotoFiles(photoFiles);
  const requests = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    let photo = '';
    const file = byField.get(photoFieldName(index));
    if (file) {
      photo = await optimizeUploadedImage(file.path, 'photo');
    }
    requests.push(buildPersonAddRequest({
      submitter: contact,
      relation: entry.relation,
      relationKey: entry.relationKey,
      relationOther: entry.relationOther,
      deceasedName: entry.name,
      deceasedFatherName: entry.fatherName,
      deceasedGender: entry.deceasedGender,
      deceasedNotes: entry.deceasedNotes,
      diedAfterSunset: entry.diedAfterSunset,
      gregorianDateOfDeath: entry.gregorianDateOfDeath,
      dataConsent: consentMeta.dataConsent === true,
      consentAt: consentMeta.consentAt,
      photo,
      photoCrop: photo ? photoCropFromDeceasedFields(entry.rawFields) : undefined,
    }));
  }

  await Synagogue.updateOne(
    { slug },
    { $push: { personAddRequests: { $each: requests } } },
  );
  return requests;
}

module.exports = {
  pushPersonAddRequests,
};
