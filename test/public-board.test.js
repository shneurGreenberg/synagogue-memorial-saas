const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { toPublicBoardPayload, toPublicPersonPayload } = require('../lib/public-board');

describe('public board payload', () => {
  const sampleBoard = {
    slug: 'demo',
    name: 'Demo Synagogue',
    title: 'Demo',
    titles: { ru: 'Demo', en: 'Demo', he: '' },
    language: 'ru',
    location: { lat: 1, long: 2, city: 'Demo', timezone: 'UTC' },
    theme: { primaryColor: '#111' },
    people: [
      {
        id: 1,
        name: 'Person One',
        photo: 'a.jpg',
        title: 'Title',
        text: '<p>Biography</p>',
        gregorianDateOfDeath: { month: 1, date: 2, year: 2000 },
        contact: { name: 'Relative', phone: '+100', email: 'secret@example.com' },
        contacts: [{ phone: '+200', email: 'other@example.com' }],
      },
    ],
    dailyCites: [{ hebrewDate: { month: 1, date: 1 }, text: 'Cite' }],
    communityEvents: [
      { title: 'Active', text: 'Now', startAt: new Date(Date.now() - 1000), endAt: new Date(Date.now() + 60_000) },
      { title: 'Ended', text: 'Past', startAt: new Date(Date.now() - 10_000), endAt: new Date(Date.now() - 1000) },
    ],
    boardFeatures: { weather: true },
    publicSubmission: { enabled: true, donationUrl: 'https://example.com' },
    memorialQrPanel: { titleScale: 1 },
    weeklyChapterEnabled: true,
    shabbatTimesEnabled: true,
    reloadTimeout: 1000,
    slideshow: false,
    baseUrl: '/s/demo',
    contactDirectory: [{ id: 'c1', name: 'Dir', phone: '+1', email: 'dir@example.com' }],
    adminUsers: [{ username: 'helper', permissions: { people: true } }],
    yahrzeitReminders: { enabled: true, notifyEmail: 'private@example.com' },
    provisioning: { notes: 'internal', donationQrImage: 'provisioning/demo/qr.png' },
    savedViews: [{ id: 'v1', name: 'View' }],
    adminTheme: { colorMode: 'dark' },
    adminLanguage: 'ru',
    activeSavedViewId: 'v1',
    adminPassword: 'should-never-leak',
    _id: 'abc',
    __v: 1,
  };

  it('keeps public fields and strips private ones', () => {
    const payload = toPublicBoardPayload(sampleBoard, { includeText: false });

    assert.equal(payload.slug, 'demo');
    assert.equal(payload.people.length, 1);
    assert.equal(payload.people[0].name, 'Person One');
    assert.equal(payload.people[0].text, undefined);
    assert.equal(payload.people[0].contact, undefined);
    assert.equal(payload.people[0].contacts, undefined);
    assert.equal(payload.contactDirectory, undefined);
    assert.equal(payload.adminUsers, undefined);
    assert.equal(payload.yahrzeitReminders, undefined);
    assert.equal(payload.provisioning, undefined);
    assert.equal(payload.savedViews, undefined);
    assert.equal(payload.adminPassword, undefined);
    assert.equal(payload.adminTheme, undefined);
    assert.equal(payload.adminLanguage, undefined);
    assert.equal(payload.activeSavedViewId, undefined);
    assert.equal(payload._id, undefined);
    assert.ok(payload.publicSubmission);
    assert.equal(payload.publicSubmission.enabled, true);
  });

  it('only includes active community events', () => {
    const payload = toPublicBoardPayload(sampleBoard);
    assert.equal(payload.communityEvents.length, 1);
    assert.equal(payload.communityEvents[0].title, 'Active');
  });

  it('can include person text when requested', () => {
    const payload = toPublicBoardPayload(sampleBoard, { includeText: true });
    assert.equal(payload.people[0].text, '<p>Biography</p>');
    assert.equal(payload.people[0].contact, undefined);
  });

  it('strips contact from single-person payload', () => {
    const person = toPublicPersonPayload(sampleBoard.people[0]);
    assert.equal(person.text, '<p>Biography</p>');
    assert.equal(person.contact, undefined);
    assert.equal(person.contacts, undefined);
    assert.equal(person.id, 1);
  });
});
