import { HtmlListAdapter } from './html-list.mjs';

export class EventbriteAdapter extends HtmlListAdapter {
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
