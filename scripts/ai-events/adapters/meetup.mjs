import * as cheerio from 'cheerio';
import { HtmlListAdapter } from './html-list.mjs';
import { normalizeEvent, normalizeUrl, normalizeWhitespace } from '../lib/normalize.mjs';

export class MeetupAdapter extends HtmlListAdapter {
  async discoverUrls() {
    const maxPages = Number(this.source.raw_config?.max_pages || process.env.AI_EVENTS_MEETUP_MAX_PAGES || 2);
    return Array.from({ length: Math.max(1, maxPages) }, (_, index) => {
      const url = new URL(this.source.url);
      if (index > 0) url.searchParams.set('page', String(index + 1));
      else url.searchParams.delete('page');
      return url.toString();
    });
  }

  async parse(raw) {
    const events = (await super.parse(raw)).filter(event => /meetup\.com\/[^/]+\/events\/\d+/i.test(event.source_url || ''));
    const $ = cheerio.load(raw.text);
    const fromLinks = [];
    $('a[href*="/events/"]').each((_, element) => {
      const href = normalizeUrl($(element).attr('href'), raw.url);
      if (!/meetup\.com\/[^/]+\/events\/\d+/i.test(href)) return;
      const title = normalizeWhitespace($(element).attr('aria-label') || $(element).text());
      if (!title) return;
      fromLinks.push(this.normalize({
        title,
        canonical_title: title,
        description: title,
        city: this.source.city,
        source_url: href,
        registration_url: href,
        confidence_score: 70,
        raw_data: { adapter: 'meetup', list_page_url: raw.url },
      }));
    });
    return [...events, ...fromLinks];
  }

  normalize(raw) {
    const title = String(raw.title || raw.name || '')
      .replace(/Every\s+\w+\s+·.*$/i, '')
      .replace(/\d+(?:\.\d+)?\s+attendees.*$/i, '')
      .trim();
    const event = normalizeEvent({
      ...raw,
      title,
    }, {
      source_url: this.source.url,
      organizer: this.source.organization_name,
    });
    if (!event.city && this.source.city) {
      const cityEn = String(this.source.city_en || '').toLowerCase();
      const haystack = [
        event.canonical_title,
        event.organizer,
        event.venue,
        event.source_url,
      ].join(' ').toLowerCase();
      if (haystack.includes(String(this.source.city).toLowerCase()) || (cityEn && haystack.includes(cityEn))) {
        event.city = this.source.city;
      }
    }
    return event;
  }
}
