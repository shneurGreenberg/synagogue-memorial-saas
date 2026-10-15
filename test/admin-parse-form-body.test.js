const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createParseFormBody } = require('../lib/admin-parse-form-body');

describe('admin parseFormBody', () => {
  it('skips multer for urlencoded bodies already parsed by express', () => {
    const upload = {
      none() {
        return (req, res, next) => {
          req.body = {};
          next();
        };
      },
    };
    const parseFormBody = createParseFormBody(upload);
    const req = {
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: { eventTitle: 'Test', publishNow: '1' },
    };
    let called = false;
    parseFormBody(req, {}, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(req.body.eventTitle, 'Test');
  });

  it('skips multer for application/json bodies', () => {
    let multerRan = false;
    const upload = {
      none() {
        return (req, res, next) => {
          multerRan = true;
          next();
        };
      },
    };
    const parseFormBody = createParseFormBody(upload);
    const req = {
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: { colorMode: 'dark' },
    };
    let called = false;
    parseFormBody(req, {}, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(multerRan, false);
    assert.equal(req.body.colorMode, 'dark');
  });

  it('uses multer for multipart requests', () => {
    let multerRan = false;
    const upload = {
      none() {
        return (req, res, next) => {
          multerRan = true;
          req.body = { eventTitle: 'From multer' };
          next();
        };
      },
    };
    const parseFormBody = createParseFormBody(upload);
    const req = {
      headers: { 'content-type': 'multipart/form-data; boundary=----x' },
      body: { eventTitle: 'Before' },
    };
    parseFormBody(req, {}, () => {
      assert.equal(multerRan, true);
      assert.equal(req.body.eventTitle, 'From multer');
    });
  });
});
