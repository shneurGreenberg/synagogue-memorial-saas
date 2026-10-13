function createParseFormBody(upload) {
  return function parseFormBody(req, res, next) {
    const contentType = String(req.headers['content-type'] || '');
    if (!contentType.includes('multipart/form-data')) {
      return next();
    }
    return upload.none()(req, res, next);
  };
}

module.exports = {
  createParseFormBody,
};
