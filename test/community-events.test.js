const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildCommunityEventPayload } = require('../lib/community-events');
const { parseCommunityEventCopyFromBody } = require('../lib/community-event-copy');

describe('community-events', () => {
  it('parses title from add-event form body', () => {
    const copy = parseCommunityEventCopyFromBody({ title: 'שמחת תורה', text: 'פרטים' });
    assert.equal(copy.title, 'שמחת תורה');
  });

  it('parses eventTitle and eventDay fields from the admin announcement form', () => {
    const copy = parseCommunityEventCopyFromBody({
      eventTitle: 'שמחת תורה',
      eventText: 'פרטים',
    });
    assert.equal(copy.title, 'שמחת תורה');
    assert.equal(copy.text, 'פרטים');

    const payload = buildCommunityEventPayload({
      eventTitle: 'Community dinner',
      eventMonth: '4',
      eventDay: '12',
      publishNow: '1',
    }, { publishNow: true });
    assert.equal(payload.title, 'Community dinner');
    assert.equal(payload.eventDate.month, 4);
    assert.equal(payload.eventDate.date, 12);
  });

  it('requires schedule start when not publishing now', () => {
    assert.throws(
      () => buildCommunityEventPayload({ title: 'Event' }, { publishNow: false }),
      /Schedule start is required/,
    );
  });

  it('publishes immediately when publishNow is set', () => {
    const payload = buildCommunityEventPayload({ title: 'Event' }, { publishNow: true });
    assert.equal(payload.title, 'Event');
    assert.ok(payload.startAt instanceof Date);
  });
});
