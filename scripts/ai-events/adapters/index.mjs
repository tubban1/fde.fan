import { EventSourceAdapter } from './base.mjs';
import { EventbriteAdapter } from './eventbrite.mjs';
import { HtmlListAdapter } from './html-list.mjs';
import { LumaAdapter } from './luma.mjs';
import { MeetupAdapter } from './meetup.mjs';
import { SegmentFaultAdapter } from './segmentfault.mjs';

export function createAdapter(source = {}) {
  const url = String(source.url || '').toLowerCase();
  if (url.includes('lu.ma') || url.includes('luma.com')) return new LumaAdapter(source);
  if (url.includes('meetup.com')) return new MeetupAdapter(source);
  if (url.includes('eventbrite.')) return new EventbriteAdapter(source);
  if (url.includes('segmentfault.com')) return new SegmentFaultAdapter(source);
  if (['html_list', 'html_detail', 'json_api', 'official_api', 'sitemap'].includes(source.fetch_method)) {
    return new HtmlListAdapter(source);
  }
  return new EventSourceAdapter(source);
}
