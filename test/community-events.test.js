const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildCommunityEventPayload } = require('../lib/community-events');
const { parseCommunityEventCopyFromBody } = require('../lib/community-event-copy');

describe('community-events', () => {
  it('parses title from add-event form body', () => {
    const copy = parseCommunityEventCopyFromBody({ title: 'שמחת תורה', text: 'פרטים' });
    assert.equal(copy.title, 'שמחת תורה');
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
