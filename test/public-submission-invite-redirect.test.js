const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const publicSubmissionRoutes = require('../routes/public-submission');

function request(server, method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        path: urlPath,
        method,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('legacy person invite URLs', () => {
  it('GET and POST redirect to public add-name', async () => {
    const app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use('/s', publicSubmissionRoutes);
    const server = app.listen(0);

    try {
      const getRes = await request(server, 'GET', '/s/demo/add-name/invite/abc123?lang=he');
      assert.equal(getRes.status, 302);
      assert.equal(getRes.headers.location, '/s/demo/add-name?lang=he');

      const postRes = await request(server, 'POST', '/s/demo/add-name/invite/abc123');
      assert.equal(postRes.status, 302);
      assert.equal(postRes.headers.location, '/s/demo/add-name');
    } finally {
      server.close();
    }
  });
});
