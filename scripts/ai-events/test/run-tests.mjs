import assert from 'node:assert/strict';
import { EventbriteAdapter } from '../adapters/eventbrite.mjs';
import { MeetupAdapter } from '../adapters/meetup.mjs';
import { normalizeCity, normalizeDateTime, normalizeUrl, isAiRelatedEvent } from '../lib/normalize.mjs';

assert.equal(normalizeUrl('https://example.com/a/?utm_source=x&recId=1#frag'), 'https://example.com/a');
assert.equal(normalizeCity('online webinar'), '线上');
assert.equal(normalizeDateTime('2026年8月1日 19:30'), '2026-08-01T11:30:00.000Z');
assert.equal(isAiRelatedEvent({ title: 'AI meetup' }), true);
assert.equal(isAiRelatedEvent({ title: 'meditation meetup' }), false);

const eventbrite = new EventbriteAdapter({
  url: 'https://www.example.com/d/example/ai/',
  fetch_method: 'json_api',
});
const eventbriteEvents = await eventbrite.parse({
  url: 'https://www.example.com/d/example/ai/',
  contentType: 'application/json',
  text: JSON.stringify({
    events: [
      {
        name: 'AI Developer Day',
        start: { utc: '2026-08-01T11:00:00Z', timezone: 'Asia/Shanghai' },
        venue: { name: 'Tech Zone', address: { city: 'Example City' } },
        url: 'https://example.com/event',
      },
    ],
  }),
});
assert.equal(eventbriteEvents.length, 1);
assert.equal(eventbriteEvents[0].canonical_title, 'AI Developer Day');

const meetup = new MeetupAdapter({
  url: 'https://www.meetup.com/find/?keywords=Artificial%20Intelligence&location=example',
  fetch_method: 'html_list',
  city: 'Example City',
  city_en: 'Example City',
});
const normalized = meetup.normalize({
  title: 'Example City AI builders Every Sat · Aug 1 · 7:30 PM CST',
  source_url: 'https://www.meetup.com/example-ai/events/123?recId=abc',
  start_time: '2026-08-01T11:30:00Z',
});
assert.equal(normalized.canonical_title, 'Example City AI builders');
assert.equal(normalized.city, 'Example City');
assert.equal(normalized.source_url, 'https://www.meetup.com/example-ai/events/123');

console.log('AI events v2 tests passed.');
