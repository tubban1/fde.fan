import * as cheerio from 'cheerio';
import { HtmlListAdapter } from './html-list.mjs';
import { normalizeUrl } from '../lib/normalize.mjs';

function decodeJsonString(value) {
  if (!value) return '';
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value.replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  }
}

function pick(pattern, text) {
  const match = text.match(pattern);
  return match ? decodeJsonString(match[1]) : '';
}

function epochToIso(value) {
  const seconds = Number(value || 0);
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

export class SegmentFaultAdapter extends HtmlListAdapter {
  async parse(raw) {
    if (/segmentfault\.com\/e\/\d+/i.test(raw.url)) {
      return this.parseDetail(raw);
    }

    const $ = cheerio.load(raw.text);
    const urls = new Set();
    $('a[href*="/e/"]').each((_, element) => {
      const href = normalizeUrl($(element).attr('href'), raw.url);
      if (/segmentfault\.com\/e\/\d+/i.test(href)) urls.add(href);
    });

    const events = [];
    const detailLimit = Number(this.source.raw_config?.detail_limit || process.env.AI_EVENTS_SEGMENTFAULT_DETAIL_LIMIT || 40);
    for (const url of [...urls].slice(0, detailLimit)) {
      try {
        const detail = await this.fetchDetail(url);
        events.push(...await this.parseDetail(detail));
      } catch {
        // Keep the source run alive when one detail page fails.
      }
    }
    return events;
  }

  parseDetail(raw) {
    const title = pick(/"name":"([^"]+)"/, raw.text);
    const start = raw.text.match(/"start":(\d{10})/)?.[1];
    if (!title || !start) return [];

    const end = raw.text.match(/"end":(\d{10})/)?.[1];
    const city = pick(/"city_name":"([^"]*)"/, raw.text);
    const address = pick(/"address":"([^"]*)"/, raw.text);
    const signUrl = pick(/"sign_url":"([^"]*)"/, raw.text) || pick(/"real_sign_url":"([^"]*)"/, raw.text);
    const organizer = pick(/"sponsors_list":\[\{"name":"([^"]+)"/, raw.text) || this.source.organization_name;
    const description = pick(/<meta name="description" content="([^"]*)"/, raw.text);

    return [
      this.normalize({
        title,
        description,
        start_time: epochToIso(start),
        end_time: epochToIso(end),
        city,
        venue: address,
        organizer,
        registration_url: signUrl || raw.url,
        source_url: raw.url,
        confidence_score: 88,
        raw_data: {
          adapter: 'segmentfault',
          source_url: raw.url,
          start,
          end,
          city,
          address,
          sign_url: signUrl,
        },
      }),
    ];
  }
}
