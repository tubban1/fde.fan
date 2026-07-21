import assert from 'node:assert/strict';
import { EventbriteAdapter } from '../adapters/eventbrite.mjs';
import { HuodongxingAdapter } from '../adapters/huodongxing.mjs';
import { MeetupAdapter } from '../adapters/meetup.mjs';
import { normalizeCity, normalizeDateTime, normalizeUrl, isAiRelatedEvent, rollYearlessPastDateForward } from '../lib/normalize.mjs';
import { classifySourceUrl } from '../lib/source-scope.mjs';

assert.equal(normalizeUrl('https://example.com/a/?utm_source=x&recId=1#frag'), 'https://example.com/a');
assert.equal(normalizeCity('online webinar'), '线上');
assert.equal(normalizeDateTime('2026年8月1日 19:30'), '2026-08-01T11:30:00.000Z');
assert.equal(
  rollYearlessPastDateForward(
    '2025-08-14T00:00:00',
    '8.14周五AI开放麦 干货分享局 AI Agent共学活动',
    { now: '2026-07-21T00:00:00Z', timezone: 'Asia/Shanghai' },
  ),
  '2026-08-14T00:00:00',
);
assert.equal(
  rollYearlessPastDateForward(
    '2025-08-14T00:00:00',
    '2025年8月14日 AI 活动',
    { now: '2026-07-21T00:00:00Z', timezone: 'Asia/Shanghai' },
  ),
  '2025-08-14T00:00:00',
);
assert.equal(isAiRelatedEvent({ title: 'AI meetup' }), true);
assert.equal(isAiRelatedEvent({ title: 'meditation meetup' }), false);
assert.deepEqual(classifySourceUrl('https://www.eventbrite.com/d/china--chengdu/ai/'), {
  source_kind: 'recurring_source',
  source_scope: 'city_ai',
  relevance_level: 'strong',
});
assert.equal(classifySourceUrl('https://segmentfault.com/events?city=510100').source_scope, 'city_tech');
assert.equal(classifySourceUrl('https://www.meetup.com/find/?location=cn--Chengdu&source=EVENTS&categoryId=546').source_scope, 'city_tech');
assert.equal(classifySourceUrl('https://lianpu.com/city/chengdu').source_scope, 'city_tech');
assert.equal(classifySourceUrl('https://luma.com/chengdu').source_scope, 'city_only');
assert.equal(classifySourceUrl('https://developer.volcengine.com/activities').source_scope, 'ai_global');
assert.equal(classifySourceUrl('https://cloud.tencent.com/developer/salon/activities?topic=2212').source_scope, 'ai_global');
assert.equal(classifySourceUrl('https://www.huodongxing.com/event/9869674477200').source_kind, 'single_event');

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
const eventbriteHtmlEvents = await eventbrite.parse({
  url: 'https://www.eventbrite.com/d/example/ai/',
  contentType: 'text/html',
  text: '<a href="https://www.eventbrite.com/e/ai-product-night-tickets-123456789">AI Product Night</a>',
});
assert.equal(eventbriteHtmlEvents.length, 1);
assert.equal(eventbriteHtmlEvents[0].source_url, 'https://www.eventbrite.com/e/ai-product-night-tickets-123456789');

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
const meetupHtmlEvents = await meetup.parse({
  url: 'https://www.meetup.com/find/?keywords=Artificial%20Intelligence&location=example',
  contentType: 'text/html',
  text: '<a href="https://www.meetup.com/example-ai/events/987654321/">Agent Builders Night</a>',
});
assert.equal(meetupHtmlEvents.length, 1);
assert.equal(meetupHtmlEvents[0].source_url, 'https://www.meetup.com/example-ai/events/987654321');

const huodongxing = new HuodongxingAdapter({
  url: 'https://www.huodongxing.com/events?tag=AI&city=成都',
  fetch_method: 'html_list',
  source_type: 'huodongxing_city',
  city: '成都',
  raw_config: { max_pages: 2 },
});
const huodongxingUrls = await huodongxing.discoverUrls();
assert.equal(huodongxingUrls.length, 2);
assert.equal(huodongxingUrls[0], 'https://cd.huodongxing.com/events?tag=AI&city=%E6%88%90%E9%83%BD&orderby=o&d=t5');
assert.equal(huodongxingUrls[1], 'https://cd.huodongxing.com/events?tag=AI&city=%E6%88%90%E9%83%BD&orderby=o&d=t5&page=2');
const huodongxingEvents = await huodongxing.parse({
  url: huodongxingUrls[0],
  contentType: 'text/html',
  text: `
    <div class="search-tab-content-item-mesh">
      <a class="item-title" href="/event/9869674477200?utm_source=x&qd=1"><span>四川外贸出海第一课｜成都工厂创业者AI跨境实战分享会</span></a>
      <div class="item-dress"><p>明天 14:00</p><span class="item-dress-pp">四川成都</span></div>
      <p class="user-name">外贸牛牛</p>
    </div>
  `,
});
assert.equal(huodongxingEvents.length, 1);
assert.equal(huodongxingEvents[0].canonical_title, '四川外贸出海第一课｜成都工厂创业者AI跨境实战分享会');
assert.equal(huodongxingEvents[0].source_url, 'https://cd.huodongxing.com/event/9869674477200');

console.log('AI events v2 tests passed.');
