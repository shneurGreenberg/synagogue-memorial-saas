function createParseFormBody(upload) {
  const parseMultipartFields = upload.none();

  return function parseFormBody(req, res, next) {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();

    if (
      !contentType
      || contentType.includes('application/x-www-form-urlencoded')
      || contentType.includes('application/json')
      || !contentType.includes('multipart/form-data')
    ) {
      return next();
    }

    if (!/boundary=/i.test(contentType)) {
      const err = new Error('Multipart form data requires a boundary');
      err.status = 400;
      return next(err);
    }

    return parseMultipartFields(req, res, (err) => {
      if (err) {
        return next(err);
      }
      return next();
    });
  };
}

module.exports = {
  createParseFormBody,
};
