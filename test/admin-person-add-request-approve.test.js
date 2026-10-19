const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const bodyParser = require('body-parser');

const SLUG = 'kaliningrad-demo';

function request(server, method, path) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        method,
        path,
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

function buildSynagogueState() {
  return {
    slug: SLUG,
    language: 'ru',
    people: [{ id: 3, name: 'Existing' }],
    personAddRequests: [
      {
        status: 'pending',
        createdAt: new Date('2025-01-10T12:00:00.000Z'),
        deceasedName: 'Иванов Иван',
        deceasedFatherName: 'Петр',
        deceasedGender: '',
        gregorianDateOfDeath: { month: 3, date: 15, year: 2019 },
        submitter: { name: 'Мария', phone: '89001234567' },
      },
      {
        id: 'req-new-1',
        status: 'pending',
        createdAt: new Date('2026-02-01T08:00:00.000Z'),
        deceasedName: 'Cohen Sarah',
        deceasedFatherName: 'David',
        deceasedGender: 'female',
        gregorianDateOfDeath: { month: 7, date: 4, year: 2021 },
        diedAfterSunset: true,
        submitter: { name: 'Ben', phone: '+14155552671', platform: 'whatsapp' },
        dataConsent: true,
      },
      {
        id: 'req-new-2',
        status: 'pending',
        createdAt: new Date('2026-02-01T08:05:00.000Z'),
        deceasedName: 'Levi Moshe',
        deceasedFatherName: 'Avraham',
        deceasedGender: 'male',
        gregorianDateOfDeath: { month: 1, day: 2, year: 2020 },
        submitter: { name: 'Ben', phone: '+14155552671' },
      },
    ],
    adminUsers: [],
    savedViews: [],
    theme: {},
    titles: { ru: 'T', en: 'T', he: 'T' },
  };
}

function buildAdminApp(getState) {
  const synagogueLoad = require('../lib/admin-synagogue-load');
  synagogueLoad.loadAdminSynagogue = async () => ({ ...getState() });
  synagogueLoad.invalidateAdminSynagogueCache = () => {};

  const boardCache = require('../lib/board-cache');
  boardCache.invalidateBoardCache = () => {};

  const Synagogue = require('../models/Synagogue');
  let state = getState();

  Synagogue.findOne = async () => state;
  Synagogue.updateOne = async (query, update) => {
    if (query.slug !== SLUG) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    if (update.$push && update.$push.people) {
      state.people = [...(state.people || []), update.$push.people];
    }
    if (update.$set) {
      Object.entries(update.$set).forEach(([path, value]) => {
        const match = /^personAddRequests\.(\d+)\.(\w+)$/.exec(path);
        if (!match) {
          return;
        }
        const index = Number(match[1]);
        const field = match[2];
        if (!state.personAddRequests[index]) {
          return;
        }
        state.personAddRequests[index][field] = value;
      });
    }
    return { matchedCount: 1, modifiedCount: 1 };
  };

  delete require.cache[require.resolve('../routes/admin.js')];
  const adminRoutes = require('../routes/admin');

  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    req.session = { adminSlug: SLUG, adminUsername: null };
    next();
  });
  app.use('/admin', adminRoutes);

  return {
    app,
    getState: () => state,
    resetState: () => {
      state = getState();
    },
  };
}

describe('admin person-add-request approve and dismiss', () => {
  let server;
  let harness;

  before(async () => {
    harness = buildAdminApp(buildSynagogueState);
    server = http.createServer(harness.app);
    await new Promise((resolve) => server.listen(0, resolve));
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('does not show wrong-community page for malformed approve URL (missing slug)', async () => {
    harness.resetState();
    const res = await request(
      server,
      'POST',
      '/admin//person-add-requests/req-new-1/approve',
    );
    assert.equal(res.status, 404);
    assert.doesNotMatch(res.body, /admin-wrong-community-page/);
    assert.doesNotMatch(res.body, /wrong_community/);
  });

  it('does not show wrong-community page when route segment is person-add-requests', async () => {
    harness.resetState();
    const res = await request(
      server,
      'POST',
      '/admin/person-add-requests/req-new-1/approve',
    );
    assert.equal(res.status, 404);
    assert.doesNotMatch(res.body, /admin-wrong-community-page/);
  });

  it('approves legacy pending without stored id or status', async () => {
    harness.resetState();
    const {
      listPendingPersonAddRequests,
      resolvePersonAddRequestPublicId,
    } = require('../lib/person-add-request');
    const state = harness.getState();
    const legacy = state.personAddRequests[0];
    const publicId = resolvePersonAddRequestPublicId(legacy, 0);
    assert.equal(listPendingPersonAddRequests(state.personAddRequests).length, 3);

    const res = await request(
      server,
      'POST',
      `/admin/${SLUG}/person-add-requests/${encodeURIComponent(publicId)}/approve`,
    );

    assert.equal(res.status, 302);
    assert.equal(res.headers.location, `/admin/${SLUG}/people`);
    const after = harness.getState();
    assert.equal(after.personAddRequests[0].status, 'dismissed');
    assert.equal(after.personAddRequests[0].id, publicId);
    assert.equal(after.people.length, 2);
    assert.match(after.people[1].name, /Иванов Иван/);
    assert.match(after.people[1].name, /сын/);
    assert.equal(after.people[1].contacts[0].phone, '89001234567');
  });

  it('approves new-format request with gender and E.164 phone', async () => {
    harness.resetState();
    const res = await request(
      server,
      'POST',
      `/admin/${SLUG}/person-add-requests/req-new-1/approve`,
    );
    assert.equal(res.status, 302);
    const after = harness.getState();
    assert.equal(after.personAddRequests[1].status, 'dismissed');
    const added = after.people.find((person) => person.name.includes('Cohen'));
    assert.ok(added);
    assert.match(added.name, /дочь/);
    assert.equal(added.diedAfterSunset, true);
    assert.equal(added.contacts[0].phone, '+14155552671');
    assert.equal(added.contacts[0].platform, 'whatsapp');
  });

  it('dismisses second new-format pending without adding a person', async () => {
    harness.resetState();
    const res = await request(
      server,
      'POST',
      `/admin/${SLUG}/person-add-requests/req-new-2/dismiss`,
    );
    assert.equal(res.status, 302);
    const after = harness.getState();
    assert.equal(after.personAddRequests[2].status, 'dismissed');
    assert.equal(after.people.length, 1);
  });

  it('approves production-shaped pending request (Oct 19 2026, male, בן)', async () => {
    const PROD_ID = '63ae778c1660311e452ad5b8';
    harness.resetState();
    const state = harness.getState();
    state.language = 'he';
    state.personAddRequests = [
      {
        id: PROD_ID,
        status: 'pending',
        submitter: {
          name: 'מגיש',
          phone: '+79001234567',
          email: 'sub@example.com',
          gender: '',
          platform: 'max',
        },
        relation: 'אחר',
        relationKey: 'other',
        relationOther: 'פרט',
        deceasedName: 'גג דד',
        deceasedFatherName: 'הה',
        deceasedGender: 'male',
        dataConsent: true,
        consentAt: new Date('2026-10-19T10:00:00.000Z'),
        diedAfterSunset: false,
        photo: '',
        photoCrop: { x: 50, y: 50, zoom: 1 },
        gregorianDateOfDeath: { month: 10, date: 19, year: 2026 },
      },
    ];

    const res = await request(
      server,
      'POST',
      `/admin/${SLUG}/person-add-requests/${PROD_ID}/approve`,
    );
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, `/admin/${SLUG}/people`);
    const after = harness.getState();
    assert.equal(after.personAddRequests[0].status, 'dismissed');
    assert.equal(after.people.length, 2);
    const added = after.people[1];
    assert.match(added.name, /גג דד/);
    assert.match(added.name, /בן/);
    assert.match(added.name, /הה/);
    assert.equal(added.diedAfterSunset, false);
    assert.deepEqual(added.gregorianDateOfDeath, { month: 10, date: 19, year: 2026 });
  });
});
