import { HtmlListAdapter } from './html-list.mjs';

export class LumaAdapter extends HtmlListAdapter {
  async parse(raw) {
    const events = await super.parse(raw);
    return events.filter(event => event.start_time);
  }

  normalize(raw) {
    return super.normalize({
      ...raw,
      title: raw.title || raw.name,
      start_time: raw.start_time || raw.startAt || raw.start_at || raw.startDate,
      end_time: raw.end_time || raw.endAt || raw.end_at || raw.endDate,
      registration_url: raw.registration_url || raw.url || raw.source_url,
      organizer: raw.organizer || raw.host || raw.calendar?.name,
    });
  }
}
