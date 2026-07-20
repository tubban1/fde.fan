import * as cheerio from 'cheerio';
import { isLikelyEvent, normalizeEvent, normalizeUrl, normalizeWhitespace } from '../lib/normalize.mjs';

export class EventSourceAdapter {
  constructor(source = {}) {
    this.source = source;
  }

  async discoverUrls() {
    return [this.source.url].filter(Boolean);
  }

  async fetchDetail(url) {
    const timeoutMs = Number(process.env.AI_EVENTS_FETCH_TIMEOUT_MS || 20000);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/json',
        'user-agent': 'fde-fan-ai-events/0.1 (+https://www.fde.fan)',
      },
    });
    if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}`);
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    return { url, contentType, text };
  }

  normalize(raw) {
    return normalizeEvent(raw, {
      source_url: this.source.url,
      organizer: this.source.organization_name,
      city: this.source.city,
    });
  }
}

export function extractJsonLdEvents(html, sourceUrl) {
  const $ = cheerio.load(html);
  const events = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items.flatMap(entry => entry['@graph'] || entry)) {
        if (!item) continue;
        const type = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (!type.some(value => String(value).toLowerCase().includes('event'))) continue;
        events.push({
          title: item.name,
          description: item.description,
          start_time: item.startDate,
          end_time: item.endDate,
          timezone: item.eventSchedule?.scheduleTimezone,
          city: item.location?.address?.addressLocality,
          venue: item.location?.name,
          organizer: item.organizer?.name,
          speakers: (item.performer || item.speaker || []).map?.(speaker => speaker.name || speaker) || [],
          price: item.offers?.price,
          registration_url: item.offers?.url || item.url || sourceUrl,
          source_url: item.url || sourceUrl,
          raw_data: item,
        });
      }
    } catch {
      // Ignore invalid JSON-LD blocks; many sites embed partially escaped tracking data.
    }
  });
  return events;
}

export function extractNextDataEvents(html, sourceUrl) {
  const $ = cheerio.load(html);
  const node = $('#__NEXT_DATA__').text();
  if (!node) return [];
  try {
    const parsed = JSON.parse(node);
    const events = [];
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (isLikelyEvent(value)) events.push({ ...value, source_url: value.url || sourceUrl });
      for (const child of Object.values(value)) visit(child);
    };
    visit(parsed);
    return events;
  } catch {
    return [];
  }
}

export function extractAnchorCandidates(html, sourceUrl) {
  const $ = cheerio.load(html);
  const candidates = [];
  $('a[href]').each((_, element) => {
    const title = normalizeWhitespace($(element).text());
    const href = normalizeUrl($(element).attr('href'), sourceUrl);
    if (!title || !href) return;
    if (!/(活动|报名|峰会|沙龙|讲座|meetup|hackathon|webinar|conference|workshop|summit)/i.test(title)) return;
    candidates.push({
      title,
      source_url: href,
      registration_url: href,
      confidence_score: 45,
    });
  });
  return candidates;
}

export function uniqueCandidates(candidates) {
  const seen = new Set();
  const unique = [];
  for (const candidate of candidates) {
    const key = `${candidate.title || candidate.name}|${candidate.source_url || candidate.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}
