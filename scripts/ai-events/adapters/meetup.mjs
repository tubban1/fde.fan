import { HtmlListAdapter } from './html-list.mjs';
import { normalizeEvent } from '../lib/normalize.mjs';

export class MeetupAdapter extends HtmlListAdapter {
  async parse(raw) {
    const events = await super.parse(raw);
    return events.filter(event => /meetup\.com\/[^/]+\/events\/\d+/i.test(event.source_url || ''));
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
