const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function scanRouterAuth(filePath, { publicPaths, authToken }) {
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const violations = [];
  const routeRe = /^router\.(get|post|put|delete|patch)\(\s*['`]([^'`]+)['`]/;

  lines.forEach((line, index) => {
    const match = line.match(routeRe);
    if (!match) {
      return;
    }
    const method = match[1];
    const routePath = match[2];
    const isPublic = publicPaths.some((p) => p === routePath);
    if (isPublic) {
      return;
    }
    const hasAuth = line.includes(authToken)
      || (authToken === 'requireMaster' && line.includes('requireMasterApi'));
    if (!hasAuth) {
      violations.push({ line: index + 1, method, routePath, snippet: line.trim() });
    }
  });

  return violations;
}

describe('invariant: admin routes require auth', () => {
  it('every /:slug admin route uses requireAdmin', () => {
    const violations = scanRouterAuth(
      path.join(__dirname, '..', 'routes', 'admin.js'),
      {
        publicPaths: ['/login', '/logout'],
        authToken: 'requireAdmin',
      },
    );
    assert.deepEqual(violations, []);
  });
});

describe('invariant: master routes require auth', () => {
  it('every master route uses requireMaster or requireMasterApi', () => {
    const violations = scanRouterAuth(
      path.join(__dirname, '..', 'routes', 'master.js'),
      {
        publicPaths: ['/login', '/logout'],
        authToken: 'requireMaster',
      },
    );
    assert.deepEqual(violations, []);
  });
});
