/** Shared limits for image uploads and JSON bodies carrying base64/data URLs. */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BODY = '50mb';

module.exports = {
  MAX_UPLOAD_BYTES,
  MAX_IMAGE_BODY,
};
