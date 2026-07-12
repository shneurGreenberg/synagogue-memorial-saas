const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertProductionSecrets,
  isAllowedImageUpload,
  publicErrorMessage,
} = require('../lib/http-security');
const { verifyMasterPassword } = require('../lib/master-auth');
const { sanitizeRichText } = require('../lib/sanitize');

describe('http security helpers', () => {
  it('allows common raster image uploads and blocks svg', () => {
    assert.equal(isAllowedImageUpload({ mimetype: 'image/jpeg' }), true);
    assert.equal(isAllowedImageUpload({ mimetype: 'image/png' }), true);
    assert.equal(isAllowedImageUpload({ mimetype: 'image/webp' }), true);
    assert.equal(isAllowedImageUpload({ mimetype: 'image/gif' }), true);
    assert.equal(isAllowedImageUpload({ mimetype: 'image/svg+xml' }), false);
    assert.equal(isAllowedImageUpload({ mimetype: 'application/pdf' }), false);
    assert.equal(isAllowedImageUpload(null), false);
  });

  it('hides error details in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    assert.equal(publicErrorMessage(new Error('db exploded')), 'Internal server error');
    process.env.NODE_ENV = previous || 'test';
  });

  it('refuses weak production secrets', () => {
    const previousEnv = process.env.NODE_ENV;
    const previousSecret = process.env.SESSION_SECRET;
    const previousMaster = process.env.MASTER_ADMIN_PASSWORD;

    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'secret';
    process.env.MASTER_ADMIN_PASSWORD = 'master';

    assert.throws(() => assertProductionSecrets(), /SESSION_SECRET/);

    process.env.NODE_ENV = previousEnv;
    process.env.SESSION_SECRET = previousSecret;
    process.env.MASTER_ADMIN_PASSWORD = previousMaster;
  });
});

describe('master auth', () => {
  it('accepts configured plaintext master password in development', async () => {
    const previous = process.env.MASTER_ADMIN_PASSWORD;
    process.env.MASTER_ADMIN_PASSWORD = 'masteradmin';
    assert.equal(await verifyMasterPassword('masteradmin'), true);
    assert.equal(await verifyMasterPassword('wrong'), false);
    process.env.MASTER_ADMIN_PASSWORD = previous;
  });
});

describe('server rich-text sanitize', () => {
  it('strips scripts and event handlers', () => {
    const cleaned = sanitizeRichText('<p onclick="alert(1)">Safe</p><script>evil()</script>');
    assert.match(cleaned, /Safe/);
    assert.doesNotMatch(cleaned, /script/i);
    assert.doesNotMatch(cleaned, /onclick/i);
  });
});
