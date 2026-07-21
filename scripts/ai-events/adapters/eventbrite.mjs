import * as cheerio from 'cheerio';
import { HtmlListAdapter } from './html-list.mjs';
import { normalizeUrl, normalizeWhitespace } from '../lib/normalize.mjs';

export class EventbriteAdapter extends HtmlListAdapter {
  async discoverUrls() {
    const maxPages = Number(this.source.raw_config?.max_pages || process.env.AI_EVENTS_EVENTBRITE_MAX_PAGES || 3);
    return Array.from({ length: Math.max(1, maxPages) }, (_, index) => {
      const url = new URL(this.source.url);
      if (index > 0) url.searchParams.set('page', String(index + 1));
      else url.searchParams.delete('page');
      return url.toString();
    });
  }

  async parse(raw) {
    const events = await super.parse(raw);
    if (/json/i.test(raw.contentType)) return events;

    const $ = cheerio.load(raw.text);
    const fromLinks = [];
    $('a[href*="/e/"]').each((_, element) => {
      const href = normalizeUrl($(element).attr('href'), raw.url);
      if (!/eventbrite\.[^/]+\/e\//i.test(href)) return;
      const title = normalizeWhitespace(
        $(element).attr('aria-label') ||
        $(element).find('[data-testid*="event-card"]').text() ||
        $(element).text(),
      );
      if (!title) return;
      fromLinks.push(this.normalize({
        title,
        canonical_title: title,
        description: title,
        source_url: href,
        registration_url: href,
        city: this.source.city,
        confidence_score: 70,
        raw_data: { adapter: 'eventbrite', list_page_url: raw.url },
      }));
    });

    return [...events, ...fromLinks];
  }

  normalize(raw) {
    return super.normalize({
      ...raw,
      title: raw.title || raw.name,
      start_time: raw.start_time || raw.start?.utc || raw.start?.local || raw.startDate,
      end_time: raw.end_time || raw.end?.utc || raw.end?.local || raw.endDate,
      timezone: raw.timezone || raw.start?.timezone,
      venue: raw.venue?.name || raw.venue,
      city: raw.city || raw.venue?.address?.city,
      registration_url: raw.registration_url || raw.url || raw.vanity_url || raw.source_url,
      organizer: raw.organizer || raw.organizer?.name,
    });
  }
}
