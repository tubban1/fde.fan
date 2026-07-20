import { EventSourceAdapter, extractAnchorCandidates, extractJsonLdEvents, extractNextDataEvents, uniqueCandidates } from './base.mjs';

export class HtmlListAdapter extends EventSourceAdapter {
  async parse(raw) {
    if (/json/i.test(raw.contentType)) {
      const parsed = JSON.parse(raw.text);
      const items = Array.isArray(parsed) ? parsed : parsed.events || parsed.data || parsed.items || [];
      return items.map(item => this.normalize({ ...item, source_url: item.url || raw.url }));
    }

    const candidates = uniqueCandidates([
      ...extractJsonLdEvents(raw.text, raw.url),
      ...extractNextDataEvents(raw.text, raw.url),
      ...extractAnchorCandidates(raw.text, raw.url),
    ]);
    return candidates.map(candidate => this.normalize(candidate));
  }
}
